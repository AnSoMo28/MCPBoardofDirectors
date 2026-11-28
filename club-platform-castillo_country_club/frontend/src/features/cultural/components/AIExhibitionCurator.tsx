/**
 * AIExhibitionCurator — "AI Exhibition Curator"
 *
 * V2 of ExhibitionFormModal. The operator doesn't pick an artist
 * and fill dates — they describe WHAT THEY WANT TO ACHIEVE and
 * the AI curates the complete exhibition concept.
 *
 * Focus areas (different from entertainment):
 * — Theme curation from member taste gaps
 * — Multi-week duration with phased programming
 * — Gallery/exhibition venue pairing
 * — Contemplative sensory recipe
 * — Cross-domain impact (café, social buzz, cultural depth)
 *
 * 4 modes:
 * 1. IntentionCapture — "What should this exhibition achieve?"
 * 2. AIProposal — AI-curated exhibition concept with predictions
 * 3. HumanRefinement — Operator refines, AI shows real-time impact
 * 4. Confirmation — Final summary
 *
 * @module cultural/components/AIExhibitionCurator
 */

import { useState, useCallback } from 'react';
import type {
  EnrichedProposal,
  ProposalChange,
  ImpactDelta
} from '../lib/proposalEnricher';
import type { DesignResult } from '../lib/eventDesigner';
import { useEventDesigner } from '../hooks/useEventDesigner';
import './AIExhibitionCurator.css';
import { Button } from "@/shared/components/ui/Button";

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface AIExhibitionCuratorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (proposal: EnrichedProposal) => void;
  memberId?: string;
}

// ══════════════════════════════════════════════════════════
//  EXHIBITION THEME SUGGESTIONS
// ══════════════════════════════════════════════════════════

const THEME_SUGGESTIONS = [
  'Arte contemporáneo accesible para socios que rara vez asisten',
  'Fotografía que conecte fitness con bienestar cultural',
  'Escultura local que active espacios subutilizados del club',
  'Arte digital inmersivo para audiencia joven',
  'Pintura clásica con recepción de vinos para socios premium',
  'Exhibición temática estacional con workshop complementario',
];

const DURATION_OPTIONS = [
  { value: '1_week', label: '1 semana', days: 7 },
  { value: '2_weeks', label: '2 semanas', days: 14 },
  { value: '3_weeks', label: '3 semanas', days: 21 },
  { value: '1_month', label: '1 mes', days: 30 },
  { value: '6_weeks', label: '6 semanas', days: 42 },
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

export function AIExhibitionCurator({
  isOpen,
  onClose,
  onConfirm,
  memberId,
}: AIExhibitionCuratorProps) {
  const designer = useEventDesigner('exhibition', memberId);

  const [intentionText, setIntentionText] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('3_weeks');
  const [lastImpactDelta, setLastImpactDelta] = useState<ImpactDelta | null>(null);

  // ── Handlers ──

  const handleSetIntention = useCallback(() => {
    if (!intentionText.trim()) return;
    const durationLabel = DURATION_OPTIONS.find(
      (d) => d.value === selectedDuration,
    )?.label ?? '3 semanas';
    designer.setIntention(`${intentionText} [duración: ${durationLabel}]`);
  }, [intentionText, selectedDuration, designer.setIntention]);

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
    setLastImpactDelta(null);
  }, [designer.reset]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setIntentionText(suggestion);
    },
    [],
  );

  if (!isOpen) return null;

  return (
    <div className="ai-exhibition-curator">
      <div className="ai-exhibition-curator__backdrop" onClick={onClose} />

      <div className="ai-exhibition-curator__modal">
        {/* ── Header ── */}
        <header className="ai-exhibition-curator__header">
          <div className="ai-exhibition-curator__header-left">
            <h2 className="ai-exhibition-curator__title">
              AI Exhibition Curator
            </h2>
            <span className="ai-exhibition-curator__phase-badge">
              {phaseLabel(designer.phase)}
            </span>
          </div>
          <Button
            variant="unstyled"
            className="ai-exhibition-curator__close"
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
          <section className="ai-exhibition-curator__section">
            <div className="ai-exhibition-curator__intention-header">
              <h3>¿Qué querés lograr con esta exhibición?</h3>
              <p className="ai-exhibition-curator__hint">
                No describas la exhibición — describí el IMPACTO que querés generar.
              </p>
            </div>

            {/* Free-text */}
            <textarea
              className="ai-exhibition-curator__textarea"
              value={intentionText}
              onChange={(e) => setIntentionText(e.target.value)}
              placeholder="Ej: Quiero una exhibición que atraiga a socios que normalmente no asisten a eventos culturales..."
              rows={4}
            />

            {/* Theme suggestions */}
            <div className="ai-exhibition-curator__suggestions">
              <span className="ai-exhibition-curator__suggestions-label">
                Ideas:
              </span>
              <div className="ai-exhibition-curator__suggestions-list">
                {THEME_SUGGESTIONS.map((suggestion) => (
                  <Button
                    variant="unstyled"
                    key={suggestion}
                    className="ai-exhibition-curator__suggestion-chip"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>

            {/* Duration selector */}
            <div className="ai-exhibition-curator__duration">
              <span className="ai-exhibition-curator__duration-label">
                Duración:
              </span>
              <div className="ai-exhibition-curator__duration-options">
                {DURATION_OPTIONS.map((opt) => (
                  <Button
                    variant="unstyled"
                    key={opt.value}
                    className={`ai-exhibition-curator__duration-chip ${
                      selectedDuration === opt.value
                        ? 'ai-exhibition-curator__duration-chip--selected'
                        : ''
                    }`}
                    onClick={() => setSelectedDuration(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Detected intent preview */}
            {designer.intent && (
              <div className="ai-exhibition-curator__detected">
                <span className="ai-exhibition-curator__detected-label">
                  Detectado:
                </span>
                <span className="ai-exhibition-curator__detected-value">
                  {designer.intent.genre.replace(/_/g, ' ')}
                </span>
                <span className="ai-exhibition-curator__detected-value">
                  {designer.intent.formality}
                </span>
                <span className="ai-exhibition-curator__confidence">
                  Confianza: {(designer.intent.confidence * 100).toFixed(0)}%
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="ai-exhibition-curator__actions">
              <Button
                variant="unstyled"
                className="ai-exhibition-curator__btn ai-exhibition-curator__btn--secondary"
                onClick={handleSetIntention}
                disabled={!intentionText.trim()}
              >
                Capturar intención
              </Button>
              <Button
                variant="unstyled"
                className="ai-exhibition-curator__btn ai-exhibition-curator__btn--primary"
                onClick={handleGenerate}
                disabled={!designer.intent}
              >
                Curar con AI →
              </Button>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════ */}
        {/*  MODE 2/3: AI PROPOSAL + REFINEMENT    */}
        {/* ═══════════════════════════════════════ */}
        {designer.phase === 'refining' && designer.design && (
          <ExhibitionRefinementView
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
          <section className="ai-exhibition-curator__section">
            <div className="ai-exhibition-curator__confirmed">
              <span className="ai-exhibition-curator__confirmed-icon">🎨</span>
              <h3>Exhibición curada exitosamente</h3>
              <p>{designer.design.proposal.title}</p>
              <p className="ai-exhibition-curator__confirmed-detail">
                {designer.design.proposal.expected_impact.attendance_estimate}{' '}
                visitantes estimados ·{' '}
                {designer.design.proposal.venue_recommendation ?? 'Venue por definir'}
              </p>
            </div>
            <div className="ai-exhibition-curator__actions">
              <Button
                variant="unstyled"
                className="ai-exhibition-curator__btn ai-exhibition-curator__btn--primary"
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
//  EXHIBITION REFINEMENT VIEW (sub-component)
// ══════════════════════════════════════════════════════════

interface ExhibitionRefinementViewProps {
  design: DesignResult;
  lastImpactDelta: ImpactDelta | null;
  readyToExecute: boolean;
  blockers: string[];
  onRefine: (change: ProposalChange) => void;
  onRegenerate: () => void;
  onConfirm: () => void;
  onReset: () => void;
}

function ExhibitionRefinementView({
  design,
  lastImpactDelta,
  readyToExecute,
  blockers,
  onRefine,
  onRegenerate,
  onConfirm,
  onReset,
}: ExhibitionRefinementViewProps) {
  const { proposal, enriched, risks } = design;

  return (
    <section className="ai-exhibition-curator__section">
      {/* AI Commentary */}
      <div className="ai-exhibition-curator__ai-says">
        <span className="ai-exhibition-curator__ai-icon">🧠</span>
        <p className="ai-exhibition-curator__ai-text">
          {generateExhibitionCommentary(design)}
        </p>
      </div>

      {/* Proposal card */}
      <div className="ai-exhibition-curator__proposal">
        <h3 className="ai-exhibition-curator__proposal-title">
          {proposal.title}
        </h3>
        <p className="ai-exhibition-curator__proposal-desc">
          {proposal.description}
        </p>

        {/* Venue */}
        <div className="ai-exhibition-curator__field">
          <span className="ai-exhibition-curator__field-label">Venue</span>
          <span className="ai-exhibition-curator__field-value">
            {proposal.venue_recommendation ?? 'Por definir'}
          </span>
          {enriched.venueMatch && (
            <span className="ai-exhibition-curator__field-score">
              Match: {enriched.venueMatch.matchScore}%
            </span>
          )}
        </div>

        {/* Duration */}
        <div className="ai-exhibition-curator__field">
          <span className="ai-exhibition-curator__field-label">Duración</span>
          <span className="ai-exhibition-curator__field-value">
            {proposal.timeline}
          </span>
        </div>

        {/* Predictions */}
        <div className="ai-exhibition-curator__predictions">
          <MiniBar
            label="Visitantes"
            value={proposal.expected_impact.attendance_estimate}
            max={200}
            suffix=""
          />
          <MiniBar
            label="Resonancia"
            value={enriched.resonancePrediction}
            max={100}
            suffix="/100"
          />
          <MiniBar
            label="Taste Match"
            value={enriched.tasteMatchScore}
            max={100}
            suffix="%"
          />
          <MiniBar
            label="Enrichment"
            value={enriched.enrichmentScore}
            max={100}
            suffix="/100"
          />
        </div>

        {/* Sensory */}
        {enriched.sensoryProfile && (
          <div className="ai-exhibition-curator__sensory">
            <span className="ai-exhibition-curator__section-label">
              Perfil Sensorial
            </span>
            <div className="ai-exhibition-curator__sensory-grid">
              <span>🔅 {enriched.sensoryProfile.lighting.mood}</span>
              <span>🔊 {enriched.sensoryProfile.acoustics.reverberation}</span>
              <span>🌡 {enriched.sensoryProfile.temperature.base}°C</span>
              <span>🌸 {enriched.sensoryProfile.aroma}</span>
            </div>
          </div>
        )}

        {/* Action steps */}
        {proposal.action_steps.length > 0 && (
          <div className="ai-exhibition-curator__steps">
            <span className="ai-exhibition-curator__section-label">
              Pasos de acción
            </span>
            <ol className="ai-exhibition-curator__steps-list">
              {proposal.action_steps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Refinement */}
      <div className="ai-exhibition-curator__refinement">
        <span className="ai-exhibition-curator__section-label">
          Refinar propuesta
        </span>
        <div className="ai-exhibition-curator__refine-actions">
          <Button
            variant="unstyled"
            className="ai-exhibition-curator__btn ai-exhibition-curator__btn--ghost"
            onClick={() =>
              onRefine({
                field: 'capacity',
                previousValue: proposal.expected_impact.attendance_estimate,
                newValue: Math.round(
                  proposal.expected_impact.attendance_estimate * 0.7,
                ),
              })
            }
          >
            Reducir visitantes 30%
          </Button>
          <Button
            variant="unstyled"
            className="ai-exhibition-curator__btn ai-exhibition-curator__btn--ghost"
            onClick={() =>
              onRefine({
                field: 'capacity',
                previousValue: proposal.expected_impact.attendance_estimate,
                newValue: Math.round(
                  proposal.expected_impact.attendance_estimate * 1.4,
                ),
              })
            }
          >
            Ampliar audiencia 40%
          </Button>
        </div>
      </div>

      {/* Impact delta */}
      {lastImpactDelta && (
        <div
          className="ai-exhibition-curator__impact-delta"
          style={{
            borderColor: lastImpactDelta.recommended ? '#4ade80' : '#ef4444',
          }}
        >
          <span className="ai-exhibition-curator__impact-label">
            Impacto del cambio
          </span>
          <p className="ai-exhibition-curator__impact-commentary">
            {lastImpactDelta.commentary}
          </p>
          <div className="ai-exhibition-curator__impact-deltas">
            {lastImpactDelta.attendanceDelta !== 0 && (
              <span>
                Visitantes: {lastImpactDelta.attendanceDelta > 0 ? '+' : ''}
                {lastImpactDelta.attendanceDelta}
              </span>
            )}
            {lastImpactDelta.resonanceDelta !== 0 && (
              <span>
                Resonancia: {lastImpactDelta.resonanceDelta > 0 ? '+' : ''}
                {lastImpactDelta.resonanceDelta}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Risks */}
      {risks.length > 0 && (
        <div className="ai-exhibition-curator__risks">
          <span className="ai-exhibition-curator__section-label">
            Riesgos
          </span>
          <div className="ai-exhibition-curator__risks-list">
            {risks.map((risk, idx) => {
              const style = RISK_STYLES[risk.severity] ?? RISK_STYLES.low;
              return (
                <div
                  key={idx}
                  className="ai-exhibition-curator__risk"
                  style={{ background: style.bg, borderColor: style.color }}
                >
                  <div className="ai-exhibition-curator__risk-header">
                    <span
                      className="ai-exhibition-curator__risk-severity"
                      style={{ color: style.color }}
                    >
                      {risk.severity.toUpperCase()}
                    </span>
                    <span className="ai-exhibition-curator__risk-type">
                      {risk.type}
                    </span>
                  </div>
                  <p className="ai-exhibition-curator__risk-desc">
                    {risk.description}
                  </p>
                  <p className="ai-exhibition-curator__risk-mitigation">
                    → {risk.mitigation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Warnings */}
      {enriched.warnings.length > 0 && (
        <div className="ai-exhibition-curator__warnings">
          {enriched.warnings.map((w, idx) => (
            <div key={idx} className="ai-exhibition-curator__warning">
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {enriched.recommendations.length > 0 && (
        <div className="ai-exhibition-curator__recommendations">
          {enriched.recommendations.map((r, idx) => (
            <div key={idx} className="ai-exhibition-curator__recommendation">
              💡 {r}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="ai-exhibition-curator__actions">
        <Button
          variant="unstyled"
          className="ai-exhibition-curator__btn ai-exhibition-curator__btn--ghost"
          onClick={onReset}
        >
          Empezar de nuevo
        </Button>
        <Button
          variant="unstyled"
          className="ai-exhibition-curator__btn ai-exhibition-curator__btn--secondary"
          onClick={onRegenerate}
        >
          Regenerar
        </Button>
        <Button
          variant="unstyled"
          className="ai-exhibition-curator__btn ai-exhibition-curator__btn--primary"
          onClick={onConfirm}
          disabled={!readyToExecute}
        >
          {readyToExecute
            ? '🎨 Curar así'
            : `Bloqueado: ${blockers[0] ?? 'riesgos pendientes'}`}
        </Button>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════
//  SHARED SUB-COMPONENTS
// ══════════════════════════════════════════════════════════

/** Mini horizontal bar with label, value, and fill. */
function MiniBar({
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
    <div className="ai-exhibition-curator__prediction">
      <div className="ai-exhibition-curator__prediction-header">
        <span className="ai-exhibition-curator__prediction-label">
          {label}
        </span>
        <span className="ai-exhibition-curator__prediction-value">
          {value}
          {suffix}
        </span>
      </div>
      <div className="ai-exhibition-curator__prediction-bar">
        <div
          className="ai-exhibition-curator__prediction-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════

function phaseLabel(phase: string): string {
  switch (phase) {
    case 'idle':        return 'Listo para curar';
    case 'intention':   return 'Intención capturada';
    case 'designing':   return 'Curando...';
    case 'refining':    return 'Refinamiento';
    case 'confirmed':   return 'Confirmado';
    default:            return phase;
  }
}

function generateExhibitionCommentary(design: DesignResult): string {
  const parts: string[] = [];
  const { enriched } = design;

  if (enriched.venueMatch) {
    const v = enriched.venueMatch;
    if (v.matchScore >= 80) {
      parts.push(
        `"${v.venueName}" es ideal para esta exhibición (${v.matchScore}% match). Su personalidad contemplativa favorece la experiencia de arte.`,
      );
    } else {
      parts.push(
        `"${v.venueName}" tiene match moderado (${v.matchScore}%). ${v.reasoning}`,
      );
    }
  }

  const resonance = enriched.resonancePrediction;
  if (resonance >= 60) {
    parts.push(`Resonancia predicted ${resonance}/100 — los socios van a conectar con esta propuesta.`);
  } else {
    parts.push(`Resonancia ${resonance}/100. Considerar un tema más accesible o una recepción de apertura para generar buzz.`);
  }

  const taste = enriched.tasteMatchScore;
  if (taste >= 70) {
    parts.push(`Taste match fuerte (${taste}%) — el tema resuena con el perfil del público objetivo.`);
  } else if (taste < 50) {
    parts.push(`Taste match bajo (${taste}%) — el tema puede no conectar. Considerar alternativas.`);
  }

  if (enriched.demandForecast) {
    const visitors = enriched.demandForecast.predictedAttendance.estimate;
    parts.push(`Visitantes estimados: ${visitors}.`);
  }

  return parts.join(' ');
}