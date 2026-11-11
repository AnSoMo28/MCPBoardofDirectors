/**
 * AIProgramDesigner — "AI Program Designer"
 *
 * V2 of ProgramFormModal. A program is NOT a single event —
 * it's a MULTI-SESSION cultural journey that transforms
 * member engagement over weeks.
 *
 * The AI detects TASTE GAPS (genres the member hasn't explored),
 * designs a multi-session program to fill those gaps, predicts
 * enrollment, and forecasts the CulturalDNA impact of completing
 * the program.
 *
 * Focus areas (different from other modals):
 * — Taste gap detection from §C1
 * — Multi-session program structure (not a single date)
 * — Venue sequence optimization (different venues per session)
 * — Enrollment prediction from taste match
 * — CulturalDNA impact forecast (how the program changes the member)
 *
 * 4 modes:
 * 1. IntentionCapture — "What gap should this program fill?"
 * 2. AIProposal — Multi-session program with enrollment + DNA forecast
 * 3. HumanRefinement — Operator refines sessions, sees enrollment shift
 * 4. Confirmation — Final program blueprint
 *
 * @module cultural/components/AIProgramDesigner
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  EnrichedProposal,
  ProposalChange,
  ImpactDelta
} from '../lib/proposalEnricher';
import type {
  DesignResult
} from '../lib/eventDesigner';
import { useEventDesigner } from '../hooks/useEventDesigner';
import './AIProgramDesigner.css';
import { Button } from "@/shared/components/ui/Button";

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface AIProgramDesignerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (proposal: EnrichedProposal) => void;
  memberId?: string;
}

// ══════════════════════════════════════════════════════════
//  PROGRAM-SPECIFIC CONSTANTS
// ══════════════════════════════════════════════════════════

/** Gap-targeted program concepts. */
const PROGRAM_CONCEPTS = [
  'Programa exploratorio — introducir socios a géneros que nunca han probado',
  'Programa de profundización — llevar fans casuales a nivel experto',
  'Programa cross-domain — combinar fitness con cultura (ej: yoga + danza)',
  'Programa social — diseñado para crear conexiones entre socios',
  'Programa estacional — alineado con ciclos del año cultural',
  'Programa premium — experiencias exclusivas de alta gama',
];

/** Session count options. */
const SESSION_OPTIONS = [
  { value: 3, label: '3 sesiones' },
  { value: 4, label: '4 sesiones' },
  { value: 6, label: '6 sesiones' },
  { value: 8, label: '8 sesiones' },
  { value: 12, label: '12 sesiones' },
];

/** Frequency options. */
const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
];
// ══════════════════════════════════════════════════════════
//  RISK STYLING
// ══════════════════════════════════════════════════════════

const RISK_STYLES: Record<string, { color: string; bg: string }> = {
  high:   { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  medium: { color: '#eab308', bg: 'rgba(234, 179, 8, 0.08)' },
  low:    { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.08)' },
};

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function AIProgramDesigner({
  isOpen,
  onClose,
  onConfirm,
  memberId,
}: AIProgramDesignerProps) {
  const designer = useEventDesigner('program', memberId);

  const [intentionText, setIntentionText] = useState('');
  const [selectedSessions, setSelectedSessions] = useState(6);
  const [selectedFrequency, setSelectedFrequency] = useState<string>('weekly');
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [lastImpactDelta, setLastImpactDelta] = useState<ImpactDelta | null>(null);

  // ── Handlers ──

  const handleSetIntention = useCallback(() => {
    if (!intentionText.trim()) return;
    const conceptSuffix = selectedConcept
      ? ` [concepto: ${selectedConcept}]`
      : '';
    const sessionSuffix = ` [sesiones: ${selectedSessions}, frecuencia: ${selectedFrequency}]`;
    designer.setIntention(intentionText + conceptSuffix + sessionSuffix);
  }, [intentionText, selectedConcept, selectedSessions, selectedFrequency, designer.setIntention]);

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
    <div className="ai-program-designer">
      <div className="ai-program-designer__backdrop" onClick={onClose} />

      <div className="ai-program-designer__modal">
        {/* ── Header ── */}
        <header className="ai-program-designer__header">
          <div className="ai-program-designer__header-left">
            <h2 className="ai-program-designer__title">
              AI Program Designer
            </h2>
            <span className="ai-program-designer__phase-badge">
              {phaseLabel(designer.phase)}
            </span>
          </div>
          <Button
            variant="unstyled"
            className="ai-program-designer__close"
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
          <section className="ai-program-designer__section">
            <div className="ai-program-designer__intention-header">
              <h3>¿Qué transformación cultural querés lograr?</h3>
              <p className="ai-program-designer__hint">
                Un programa no es una lista de eventos — es un viaje de
                múltiples sesiones que transforma el perfil cultural de los
                socios.
              </p>
            </div>

            {/* Concept suggestions */}
            <div className="ai-program-designer__concepts">
              <span className="ai-program-designer__concepts-label">
                Conceptos:
              </span>
              <div className="ai-program-designer__concepts-grid">
                {PROGRAM_CONCEPTS.map((concept) => (
                  <Button
                    variant="unstyled"
                    key={concept}
                    className={`ai-program-designer__concept-chip ${
                      selectedConcept === concept
                        ? 'ai-program-designer__concept-chip--selected'
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
              className="ai-program-designer__textarea"
              value={intentionText}
              onChange={(e) => setIntentionText(e.target.value)}
              placeholder="Ej: Quiero un programa que enganche a los socios fitness que nunca asisten a eventos culturales..."
              rows={4}
            />

            {/* Session count selector */}
            <div className="ai-program-designer__config-row">
              <div className="ai-program-designer__config">
                <span className="ai-program-designer__config-label">
                  Sesiones:
                </span>
                <div className="ai-program-designer__config-options">
                  {SESSION_OPTIONS.map((opt) => (
                    <Button
                      variant="unstyled"
                      key={opt.value}
                      className={`ai-program-designer__config-chip ${
                        selectedSessions === opt.value
                          ? 'ai-program-designer__config-chip--selected'
                          : ''
                      }`}
                      onClick={() => setSelectedSessions(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="ai-program-designer__config">
                <span className="ai-program-designer__config-label">
                  Frecuencia:
                </span>
                <div className="ai-program-designer__config-options">
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <Button
                      variant="unstyled"
                      key={opt.value}
                      className={`ai-program-designer__config-chip ${
                        selectedFrequency === opt.value
                          ? 'ai-program-designer__config-chip--selected'
                          : ''
                      }`}
                      onClick={() => setSelectedFrequency(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Detected preview */}
            {designer.intent && (
              <div className="ai-program-designer__detected">
                <span className="ai-program-designer__detected-label">
                  Detectado:
                </span>
                <span className="ai-program-designer__detected-value">
                  {designer.intent.genre.replace(/_/g, ' ')}
                </span>
                <span className="ai-program-designer__detected-value">
                  {designer.intent.formality}
                </span>
                <span className="ai-program-designer__confidence">
                  Confianza: {(designer.intent.confidence * 100).toFixed(0)}%
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="ai-program-designer__actions">
              <Button
                variant="unstyled"
                className="ai-program-designer__btn ai-program-designer__btn--secondary"
                onClick={handleSetIntention}
                disabled={!intentionText.trim()}
              >
                Capturar intención
              </Button>
              <Button
                variant="unstyled"
                className="ai-program-designer__btn ai-program-designer__btn--primary"
                onClick={handleGenerate}
                disabled={!designer.intent}
              >
                Diseñar programa con AI →
              </Button>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════ */}
        {/*  MODE 2/3: AI PROPOSAL + REFINEMENT    */}
        {/* ═══════════════════════════════════════ */}
        {designer.phase === 'refining' && designer.design && (
          <ProgramRefinementView
            design={designer.design}
            selectedSessions={selectedSessions}
            selectedFrequency={selectedFrequency}
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
          <section className="ai-program-designer__section">
            <div className="ai-program-designer__confirmed">
              <span className="ai-program-designer__confirmed-icon">📚</span>
              <h3>Programa diseñado exitosamente</h3>
              <p>{designer.design.proposal.title}</p>
              <div className="ai-program-designer__confirmed-stats">
                <span>
                  {selectedSessions} sesiones · {selectedFrequency}
                </span>
                <span>
                  {designer.design.proposal.expected_impact.attendance_estimate}{' '}
                  participantes estimados
                </span>
                <span>
                  Venue:{' '}
                  {designer.design.proposal.venue_recommendation ?? 'Por definir'}
                </span>
              </div>
            </div>
            <div className="ai-program-designer__actions">
              <Button
                variant="unstyled"
                className="ai-program-designer__btn ai-program-designer__btn--primary"
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
//  PROGRAM REFINEMENT VIEW (sub-component)
// ══════════════════════════════════════════════════════════

interface ProgramRefinementViewProps {
  design: DesignResult;
  selectedSessions: number;
  selectedFrequency: string;
  lastImpactDelta: ImpactDelta | null;
  readyToExecute: boolean;
  blockers: string[];
  onRefine: (change: ProposalChange) => void;
  onRegenerate: () => void;
  onConfirm: () => void;
  onReset: () => void;
}

function ProgramRefinementView({
  design,
  selectedSessions,
  selectedFrequency,
  lastImpactDelta,
  readyToExecute,
  blockers,
  onRefine,
  onRegenerate,
  onConfirm,
  onReset,
}: ProgramRefinementViewProps) {
  const { proposal, enriched, risks } = design;

  // Build synthetic session previews
  const sessions = useMemo(() => {
    const total = selectedSessions;
    const baseTitle = proposal.title;
    return Array.from({ length: total }, (_, i) => ({
      session: i + 1,
      title: `Sesión ${i + 1}: ${baseTitle}`,
      progress: Math.round(((i + 1) / total) * 100),
    }));
  }, [selectedSessions, proposal.title]);

  // Estimate DNA impact
  const dnaImpact = useMemo(() => {
    const base = Math.round(selectedSessions * 3.5);
    return {
      openness: Math.min(100, 50 + base),
      depth: Math.min(100, 50 + Math.round(base * 0.8)),
      adventurousness: Math.min(100, 50 + Math.round(base * 1.2)),
      cultural_maturity: Math.min(100, 50 + Math.round(base * 0.6)),
    };
  }, [selectedSessions]);

  return (
    <section className="ai-program-designer__section">
      {/* AI Commentary */}
      <div className="ai-program-designer__ai-says">
        <span className="ai-program-designer__ai-icon">🧠</span>
        <p className="ai-program-designer__ai-text">
          {generateProgramCommentary(design, selectedSessions, selectedFrequency)}
        </p>
      </div>

      {/* Proposal card */}
      <div className="ai-program-designer__proposal">
        <h3 className="ai-program-designer__proposal-title">
          {proposal.title}
        </h3>
        <p className="ai-program-designer__proposal-desc">
          {proposal.description}
        </p>

        {/* Program structure */}
        <div className="ai-program-designer__structure">
          <div className="ai-program-designer__structure-header">
            <span className="ai-program-designer__section-label">
              Estructura del programa
            </span>
            <span className="ai-program-designer__structure-meta">
              {selectedSessions} sesiones · {frequencyLabel(selectedFrequency)}
            </span>
          </div>

          {/* Session timeline */}
          <div className="ai-program-designer__sessions">
            {sessions.map((session) => (
              <div
                key={session.session}
                className="ai-program-designer__session"
              >
                <div className="ai-program-designer__session-marker">
                  <span className="ai-program-designer__session-number">
                    {session.session}
                  </span>
                </div>
                <div className="ai-program-designer__session-info">
                  <span className="ai-program-designer__session-title">
                    {session.title}
                  </span>
                  <div className="ai-program-designer__session-progress-bar">
                    <div
                      className="ai-program-designer__session-progress-fill"
                      style={{ width: `${session.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Venue */}
        <div className="ai-program-designer__field">
          <span className="ai-program-designer__field-label">Venue</span>
          <span className="ai-program-designer__field-value">
            {proposal.venue_recommendation ?? 'Por definir'}
          </span>
          {enriched.venueMatch && (
            <span className="ai-program-designer__field-score">
              Match: {enriched.venueMatch.matchScore}%
            </span>
          )}
        </div>

        {/* Predictions */}
        <div className="ai-program-designer__predictions-hero">
          <div className="ai-program-designer__prediction-card">
            <span className="ai-program-designer__prediction-number">
              {proposal.expected_impact.attendance_estimate}
            </span>
            <span className="ai-program-designer__prediction-label">
              Participantes
            </span>
          </div>
          <div className="ai-program-designer__prediction-card">
            <span className="ai-program-designer__prediction-number">
              {enriched.resonancePrediction}
            </span>
            <span className="ai-program-designer__prediction-label">
              Resonancia /100
            </span>
          </div>
          <div className="ai-program-designer__prediction-card">
            <span className="ai-program-designer__prediction-number">
              {enriched.tasteMatchScore}%
            </span>
            <span className="ai-program-designer__prediction-label">
              Taste Match
            </span>
          </div>
          <div className="ai-program-designer__prediction-card">
            <span className="ai-program-designer__prediction-number">
              {Math.round(
                enriched.tasteMatchScore * selectedSessions * 0.01,
              )}
            </span>
            <span className="ai-program-designer__prediction-label">
              Retención est.
            </span>
          </div>
        </div>

        {/* DNA Impact Forecast */}
        <div className="ai-program-designer__dna-impact">
          <span className="ai-program-designer__section-label">
            Impacto en CulturalDNA (forecast)
          </span>
          <p className="ai-program-designer__dna-explain">
            Si los participantes completan el programa, su perfil cultural
            cambiaría así:
          </p>
          <div className="ai-program-designer__dna-bars">
            <DNABar label="Apertura" value={dnaImpact.openness} />
            <DNABar label="Profundidad" value={dnaImpact.depth} />
            <DNABar label="Aventura" value={dnaImpact.adventurousness} />
            <DNABar
              label="Madurez cultural"
              value={dnaImpact.cultural_maturity}
            />
          </div>
        </div>

        {/* Sensory */}
        {enriched.sensoryProfile && (
          <div className="ai-program-designer__sensory">
            <span className="ai-program-designer__section-label">
              Ambiente de cada sesión
            </span>
            <div className="ai-program-designer__sensory-grid">
              <span>🔅 {enriched.sensoryProfile.lighting.mood}</span>
              <span>🔊 {enriched.sensoryProfile.acoustics.reverberation}</span>
              <span>🌡 {enriched.sensoryProfile.temperature.base}°C</span>
              <span>🌸 {enriched.sensoryProfile.aroma}</span>
            </div>
          </div>
        )}

        {/* Action steps */}
        {proposal.action_steps.length > 0 && (
          <div className="ai-program-designer__steps">
            <span className="ai-program-designer__section-label">
              Plan de ejecución
            </span>
            <ol className="ai-program-designer__steps-list">
              {proposal.action_steps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Refinement */}
      <div className="ai-program-designer__refinement">
        <span className="ai-program-designer__section-label">
          Refinar programa
        </span>
        <div className="ai-program-designer__refine-actions">
          <Button
            variant="unstyled"
            className="ai-program-designer__btn ai-program-designer__btn--ghost"
            onClick={() =>
              onRefine({
                field: 'capacity',
                previousValue:
                  proposal.expected_impact.attendance_estimate,
                newValue: Math.round(
                  proposal.expected_impact.attendance_estimate * 0.6,
                ),
              })
            }
          >
            Grupo pequeño (-40%)
          </Button>
          <Button
            variant="unstyled"
            className="ai-program-designer__btn ai-program-designer__btn--ghost"
            onClick={() =>
              onRefine({
                field: 'capacity',
                previousValue:
                  proposal.expected_impact.attendance_estimate,
                newValue: Math.round(
                  proposal.expected_impact.attendance_estimate * 1.5,
                ),
              })
            }
          >
            Grupo grande (+50%)
          </Button>
          <Button
            variant="unstyled"
            className="ai-program-designer__btn ai-program-designer__btn--ghost"
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
          className="ai-program-designer__impact-delta"
          style={{
            borderColor: lastImpactDelta.recommended
              ? '#4ade80'
              : '#ef4444',
          }}
        >
          <span className="ai-program-designer__impact-label">
            Impacto del cambio
          </span>
          <p className="ai-program-designer__impact-commentary">
            {lastImpactDelta.commentary}
          </p>
          <div className="ai-program-designer__impact-deltas">
            {lastImpactDelta.attendanceDelta !== 0 && (
              <span>
                Participantes:{' '}
                {lastImpactDelta.attendanceDelta > 0 ? '+' : ''}
                {lastImpactDelta.attendanceDelta}
              </span>
            )}
            {lastImpactDelta.resonanceDelta !== 0 && (
              <span>
                Resonancia:{' '}
                {lastImpactDelta.resonanceDelta > 0 ? '+' : ''}
                {lastImpactDelta.resonanceDelta}
              </span>
            )}
            {lastImpactDelta.revenueDelta !== 0 && (
              <span>
                Revenue:{' '}
                {lastImpactDelta.revenueDelta > 0 ? '+' : ''}
                {lastImpactDelta.revenueDelta.toLocaleString()} CRC
              </span>
            )}
          </div>
        </div>
      )}

      {/* Risks */}
      {risks.length > 0 && (
        <div className="ai-program-designer__risks">
          <span className="ai-program-designer__section-label">
            Riesgos
          </span>
          <div className="ai-program-designer__risks-list">
            {risks.map((risk, idx) => {
              const style = RISK_STYLES[risk.severity] ?? RISK_STYLES.low;
              return (
                <div
                  key={idx}
                  className="ai-program-designer__risk"
                  style={{
                    background: style.bg,
                    borderColor: style.color,
                  }}
                >
                  <div className="ai-program-designer__risk-header">
                    <span
                      className="ai-program-designer__risk-severity"
                      style={{ color: style.color }}
                    >
                      {risk.severity.toUpperCase()}
                    </span>
                    <span className="ai-program-designer__risk-type">
                      {risk.type}
                    </span>
                  </div>
                  <p className="ai-program-designer__risk-desc">
                    {risk.description}
                  </p>
                  <p className="ai-program-designer__risk-mitigation">
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
        <div className="ai-program-designer__warnings">
          {enriched.warnings.map((w, idx) => (
            <div key={idx} className="ai-program-designer__warning">
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {enriched.recommendations.length > 0 && (
        <div className="ai-program-designer__recommendations">
          {enriched.recommendations.map((r, idx) => (
            <div key={idx} className="ai-program-designer__recommendation">
              💡 {r}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="ai-program-designer__actions">
        <Button
          variant="unstyled"
          className="ai-program-designer__btn ai-program-designer__btn--ghost"
          onClick={onReset}
        >
          Empezar de nuevo
        </Button>
        <Button
          variant="unstyled"
          className="ai-program-designer__btn ai-program-designer__btn--secondary"
          onClick={onRegenerate}
        >
          Regenerar
        </Button>
        <Button
          variant="unstyled"
          className="ai-program-designer__btn ai-program-designer__btn--primary"
          onClick={onConfirm}
          disabled={!readyToExecute}
        >
          {readyToExecute
            ? '📚 Lanzar programa'
            : `Bloqueado: ${blockers[0] ?? 'riesgos pendientes'}`}
        </Button>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ══════════════════════════════════════════════════════════

/** DNA impact bar — horizontal bar showing predicted DNA dimension change. */
function DNABar({ label, value }: { label: string; value: number }) {
  return (
    <div className="ai-program-designer__dna-bar">
      <div className="ai-program-designer__dna-bar-header">
        <span className="ai-program-designer__dna-bar-label">{label}</span>
        <span className="ai-program-designer__dna-bar-value">{value}</span>
      </div>
      <div className="ai-program-designer__dna-bar-track">
        <div
          className="ai-program-designer__dna-bar-fill"
          style={{ width: `${value}%` }}
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
    case 'idle':
      return 'Listo para diseñar';
    case 'intention':
      return 'Intención capturada';
    case 'designing':
      return 'Diseñando programa...';
    case 'refining':
      return 'Refinamiento';
    case 'confirmed':
      return 'Confirmado';
    default:
      return phase;
  }
}

function frequencyLabel(freq: string): string {
  switch (freq) {
    case 'weekly':
      return 'semanal';
    case 'biweekly':
      return 'quincenal';
    case 'monthly':
      return 'mensual';
    default:
      return freq;
  }
}

function generateProgramCommentary(
  design: DesignResult,
  sessions: number,
  frequency: string,
): string {
  const parts: string[] = [];
  const { enriched, proposal } = design;

  // Venue
  if (enriched.venueMatch) {
    const v = enriched.venueMatch;
    if (v.matchScore >= 80) {
      parts.push(
        `"${v.venueName}" es ideal como base para este programa (${v.matchScore}% match). Su ambiente favorece el aprendizaje progresivo.`,
      );
    } else if (v.matchScore >= 60) {
      parts.push(
        `"${v.venueName}" es aceptable (${v.matchScore}%) pero podría beneficiarse de un espacio más enfocado en la actividad.`,
      );
    } else {
      parts.push(
        `El venue "${v.venueName}" tiene match bajo (${v.matchScore}%). ${v.reasoning}`,
      );
    }
  }

  // Program structure
  parts.push(
    `Programa de ${sessions} sesiones ${frequencyLabel(frequency)}s para ${proposal.expected_impact.attendance_estimate} participantes.`,
  );

  // Resonance
  const resonance = enriched.resonancePrediction;
  if (resonance >= 70) {
    parts.push(
      `Alta resonancia predicted (${resonance}/100) — los participantes van a conectar profundamente con el contenido.`,
    );
  } else if (resonance >= 50) {
    parts.push(
      `Resonancia moderada (${resonance}/100). Las primeras sesiones pueden necesitar hooks más fuertes para engagement.`,
    );
  } else {
    parts.push(
      `Resonancia baja (${resonance}/100). El tema puede no estar conectando — considerar un enfoque más accesible.`,
    );
  }

  // Taste match
  const taste = enriched.tasteMatchScore;
  if (taste >= 70) {
    parts.push(
      `Taste match fuerte (${taste}%) — el contenido del programa alinea bien con los intereses del público.`,
    );
  } else if (taste < 50) {
    parts.push(
      `Taste match bajo (${taste}%) — el programa puede ser percibido como demasiado niche.`,
    );
  }

  // Retention estimate
  const retention = Math.round(taste * sessions * 0.01);
  parts.push(
    `Retención estimada: ${retention} de ${proposal.expected_impact.attendance_estimate} participantes completarían todas las sesiones.`,
  );

  return parts.join(' ');
}