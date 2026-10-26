/**
 * AISocialArchitect — "AI Social Architect"
 *
 * V2 of SocialEventFormModal. A social event is not about
 * entertainment — it's a SOCIAL INTERVENTION designed to
 * strengthen weak connections, bridge clusters, and build
 * cohesion in the club's social fabric.
 *
 * The AI analyzes the social graph to identify:
 * — Weak connections that should be strengthened
 * — Cluster bridges (members who connect separate groups)
 * — Isolation risks (members with few connections)
 * — Optimal group compositions for bonding
 *
 * Focus areas (different from other modals):
 * — Social graph analysis for target identification
 * — Connection strength optimization
 * — Cluster bridging design
 * — Social cohesion metrics
 * — Group size and composition tuning
 *
 * 4 modes:
 * 1. IntentionCapture — "What social outcome do you want?"
 * 2. AIProposal — Social intervention with targeting + composition
 * 3. HumanRefinement — Operator refines targets, sees cohesion shift
 * 4. Confirmation — Final social blueprint
 *
 * @module cultural/components/AISocialArchitect
 */

import { useState, useCallback, useMemo } from 'react';

import type {
  EnrichedProposal,
  ProposalChange,
  ImpactDelta
} from '../lib/proposalEnricher';
import type { DesignResult } from '../lib/eventDesigner';
import { useEventDesigner } from '../hooks/useEventDesigner';
import './AISocialArchitect.css';

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface AISocialArchitectProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (proposal: EnrichedProposal) => void;
  memberId?: string;
}

// ══════════════════════════════════════════════════════════
//  SOCIAL GOAL OPTIONS
// ══════════════════════════════════════════════════════════

const SOCIAL_GOALS = [
  { id: 'bonding', label: 'Bonding — fortalecer conexiones existentes', icon: '🤝' },
  { id: 'bridging', label: 'Bridging — conectar clusters separados', icon: '🌉' },
  { id: 'inclusion', label: 'Inclusión — integrar socios aislados', icon: '🫂' },
  { id: 'celebration', label: 'Celebración — marcar un hito social', icon: '🎉' },
  { id: 'exploration', label: 'Exploración — mezclar perfiles distintos', icon: '🔬' },
];

const GROUP_SIZE_OPTIONS = [
  { value: 6, label: 'Íntimo (6)' },
  { value: 10, label: 'Pequeño (10)' },
  { value: 20, label: 'Mediano (20)' },
  { value: 40, label: 'Grande (40)' },
  { value: 80, label: 'Masivo (80)' },
];

const ACTIVITY_SUGGESTIONS = [
  'Cena con conversación guiada entre desconocidos',
  'Team challenge cooperativo con mezcla de perfiles',
  'Degustación a ciegas con parejas aleatorias',
  'Taller colaborativo donde cada socio aporta algo distinto',
  'Speed networking cultural — 5 minutos por mesa',
  'Paseo cultural grupal con guía y preguntas para conectar',
];

// ══════════════════════════════════════════════════════════
//  RISK STYLING
// ══════════════════════════════════════════════════════════

const RISK_STYLES: Record<string, { color: string; bg: string }> = {
  high:   { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  medium: { color: '#eab308', bg: 'rgba(234, 179, 8, 0.08)' },
  low:    { color: '#4ade80', bg: 'rgba(74, 222, 128, 0.08)' },
};

// ══════════════════════════════════════════════════════════
//  RELATIONSHIP LABELS
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function AISocialArchitect({
  isOpen,
  onClose,
  onConfirm,
  memberId,
}: AISocialArchitectProps) {
  const designer = useEventDesigner('social', memberId);

  const [intentionText, setIntentionText] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedGroupSize, setSelectedGroupSize] = useState(20);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [lastImpactDelta, setLastImpactDelta] = useState<ImpactDelta | null>(null);

  // ── Handlers ──

  const handleSetIntention = useCallback(() => {
    if (!intentionText.trim()) return;
    const goalSuffix = selectedGoal ? ` [goal: ${selectedGoal}]` : '';
    const sizeSuffix = ` [group: ${selectedGroupSize}]`;
    designer.setIntention(intentionText + goalSuffix + sizeSuffix);
  }, [intentionText, selectedGoal, selectedGroupSize, designer.setIntention]);

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
    setSelectedGoal(null);
    setSelectedActivity(null);
    setLastImpactDelta(null);
  }, [designer.reset]);

  if (!isOpen) return null;

  return (
    <div className="ai-social-architect">
      <div className="ai-social-architect__backdrop" onClick={onClose} />

      <div className="ai-social-architect__modal">
        {/* ── Header ── */}
        <header className="ai-social-architect__header">
          <div className="ai-social-architect__header-left">
            <h2 className="ai-social-architect__title">
              AI Social Architect
            </h2>
            <span className="ai-social-architect__phase-badge">
              {phaseLabel(designer.phase)}
            </span>
          </div>
          <button
            className="ai-social-architect__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        {/* ═══════════════════════════════════════ */}
        {/*  MODE 1: INTENTION CAPTURE             */}
        {/* ═══════════════════════════════════════ */}
        {(designer.phase === 'idle' || designer.phase === 'intention') && (
          <section className="ai-social-architect__section">
            <div className="ai-social-architect__intention-header">
              <h3>¿Qué resultado social querés lograr?</h3>
              <p className="ai-social-architect__hint">
                Un evento social es una intervención en la red de conexiones
                del club. Definí el objetivo, no el formato.
              </p>
            </div>

            {/* Social goal selector */}
            <div className="ai-social-architect__goals">
              <span className="ai-social-architect__goals-label">
                Objetivo social:
              </span>
              <div className="ai-social-architect__goals-grid">
                {SOCIAL_GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    className={`ai-social-architect__goal-chip ${
                      selectedGoal === goal.id
                        ? 'ai-social-architect__goal-chip--selected'
                        : ''
                    }`}
                    onClick={() => {
                      setSelectedGoal(selectedGoal === goal.id ? null : goal.id);
                    }}
                  >
                    <span className="ai-social-architect__goal-icon">
                      {goal.icon}
                    </span>
                    <span className="ai-social-architect__goal-label">
                      {goal.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Free-text */}
            <textarea
              className="ai-social-architect__textarea"
              value={intentionText}
              onChange={(e) => setIntentionText(e.target.value)}
              placeholder="Ej: Quiero crear conexiones entre el cluster de socios fitness y el cluster cultural..."
              rows={4}
            />

            {/* Activity suggestions */}
            <div className="ai-social-architect__suggestions">
              <span className="ai-social-architect__suggestions-label">
                Ideas de actividad:
              </span>
              <div className="ai-social-architect__suggestions-list">
                {ACTIVITY_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    className={`ai-social-architect__suggestion-chip ${
                      selectedActivity === suggestion
                        ? 'ai-social-architect__suggestion-chip--selected'
                        : ''
                    }`}
                    onClick={() => {
                      setSelectedActivity(
                        selectedActivity === suggestion ? null : suggestion,
                      );
                      if (!intentionText.trim()) {
                        setIntentionText(suggestion);
                      }
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Group size */}
            <div className="ai-social-architect__group-size">
              <span className="ai-social-architect__group-size-label">
                Tamaño del grupo:
              </span>
              <div className="ai-social-architect__group-size-options">
                {GROUP_SIZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`ai-social-architect__group-chip ${
                      selectedGroupSize === opt.value
                        ? 'ai-social-architect__group-chip--selected'
                        : ''
                    }`}
                    onClick={() => setSelectedGroupSize(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Detected preview */}
            {designer.intent && (
              <div className="ai-social-architect__detected">
                <span className="ai-social-architect__detected-label">
                  Detectado:
                </span>
                <span className="ai-social-architect__detected-value">
                  {designer.intent.genre.replace(/_/g, ' ')}
                </span>
                <span className="ai-social-architect__detected-value">
                  {designer.intent.formality}
                </span>
                {designer.intent.vibes.length > 0 && (
                  <span className="ai-social-architect__detected-value">
                    {designer.intent.vibes[0]}
                  </span>
                )}
                <span className="ai-social-architect__confidence">
                  Confianza: {(designer.intent.confidence * 100).toFixed(0)}%
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="ai-social-architect__actions">
              <button
                className="ai-social-architect__btn ai-social-architect__btn--secondary"
                onClick={handleSetIntention}
                disabled={!intentionText.trim()}
              >
                Capturar intención
              </button>
              <button
                className="ai-social-architect__btn ai-social-architect__btn--primary"
                onClick={handleGenerate}
                disabled={!designer.intent}
              >
                Diseñar intervención →
              </button>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════ */}
        {/*  MODE 2/3: AI PROPOSAL + REFINEMENT    */}
        {/* ═══════════════════════════════════════ */}
        {designer.phase === 'refining' && designer.design && (
          <SocialRefinementView
            design={designer.design}
            selectedGoal={selectedGoal}
            selectedGroupSize={selectedGroupSize}
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
          <section className="ai-social-architect__section">
            <div className="ai-social-architect__confirmed">
              <span className="ai-social-architect__confirmed-icon">🤝</span>
              <h3>Intervención social diseñada</h3>
              <p>{designer.design.proposal.title}</p>
              <div className="ai-social-architect__confirmed-stats">
                <span>
                  {selectedGroupSize} participantes ·{' '}
                  {goalLabel(selectedGoal)}
                </span>
                <span>
                  {designer.design.proposal.expected_impact.attendance_estimate}{' '}
                  asistentes estimados
                </span>
                <span>
                  Venue:{' '}
                  {designer.design.proposal.venue_recommendation ?? 'Por definir'}
                </span>
              </div>
            </div>
            <div className="ai-social-architect__actions">
              <button
                className="ai-social-architect__btn ai-social-architect__btn--primary"
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  SOCIAL REFINEMENT VIEW (sub-component)
// ══════════════════════════════════════════════════════════

interface SocialRefinementViewProps {
  design: DesignResult;
  selectedGoal: string | null;
  selectedGroupSize: number;
  lastImpactDelta: ImpactDelta | null;
  readyToExecute: boolean;
  blockers: string[];
  onRefine: (change: ProposalChange) => void;
  onRegenerate: () => void;
  onConfirm: () => void;
  onReset: () => void;
}

function SocialRefinementView({
  design,
  selectedGoal,
  selectedGroupSize,
  lastImpactDelta,
  readyToExecute,
  blockers,
  onRefine,
  onRegenerate,
  onConfirm,
  onReset,
}: SocialRefinementViewProps) {
  const { proposal, enriched, risks } = design;

  // Synthesize social targeting metrics from the design
  const socialMetrics = useMemo(() => {
    const attendance = proposal.expected_impact.attendance_estimate;
    const connectionDensity = Math.min(
      100,
      Math.round((attendance / selectedGroupSize) * 40 + 20),
    );
    const bridgePotential =
      selectedGoal === 'bridging'
        ? 80
        : selectedGoal === 'inclusion'
          ? 70
          : selectedGoal === 'exploration'
            ? 65
            : 40;
    const cohesionLift = Math.round(
      enriched.resonancePrediction * 0.4 +
        connectionDensity * 0.3 +
        bridgePotential * 0.3,
    );

    return {
      connectionDensity,
      bridgePotential,
      cohesionLift: Math.min(100, cohesionLift),
      targetConnections: Math.round(attendance * 1.5),
    };
  }, [proposal, enriched, selectedGoal, selectedGroupSize]);

  return (
    <section className="ai-social-architect__section">
      {/* AI Commentary */}
      <div className="ai-social-architect__ai-says">
        <span className="ai-social-architect__ai-icon">🧠</span>
        <p className="ai-social-architect__ai-text">
          {generateSocialCommentary(design, selectedGoal, selectedGroupSize)}
        </p>
      </div>

      {/* Social targeting summary */}
      <div className="ai-social-architect__targeting">
        <span className="ai-social-architect__section-label">
          Targeting social
        </span>
        <div className="ai-social-architect__targeting-grid">
          <SocialMetricCard
            icon="🔗"
            label="Densidad de conexión"
            value={`${socialMetrics.connectionDensity}%`}
          />
          <SocialMetricCard
            icon="🌉"
            label="Potencial de puente"
            value={`${socialMetrics.bridgePotential}%`}
          />
          <SocialMetricCard
            icon="📈"
            label="Cohesión estimada"
            value={`+${socialMetrics.cohesionLift}`}
          />
          <SocialMetricCard
            icon="🤝"
            label="Conexiones nuevas"
            value={`~${socialMetrics.targetConnections}`}
          />
        </div>
      </div>

      {/* Proposal card */}
      <div className="ai-social-architect__proposal">
        <h3 className="ai-social-architect__proposal-title">
          {proposal.title}
        </h3>
        <p className="ai-social-architect__proposal-desc">
          {proposal.description}
        </p>

        {/* Venue */}
        <div className="ai-social-architect__field">
          <span className="ai-social-architect__field-label">Venue</span>
          <span className="ai-social-architect__field-value">
            {proposal.venue_recommendation ?? 'Por definir'}
          </span>
          {enriched.venueMatch && (
            <span className="ai-social-architect__field-score">
              Match: {enriched.venueMatch.matchScore}%
            </span>
          )}
        </div>

        {/* Predictions hero */}
        <div className="ai-social-architect__predictions-hero">
          <div className="ai-social-architect__prediction-card">
            <span className="ai-social-architect__prediction-number">
              {proposal.expected_impact.attendance_estimate}
            </span>
            <span className="ai-social-architect__prediction-label">
              Asistentes
            </span>
          </div>
          <div className="ai-social-architect__prediction-card">
            <span className="ai-social-architect__prediction-number">
              {enriched.resonancePrediction}
            </span>
            <span className="ai-social-architect__prediction-label">
              Resonancia /100
            </span>
          </div>
          <div className="ai-social-architect__prediction-card">
            <span className="ai-social-architect__prediction-number">
              {enriched.tasteMatchScore}%
            </span>
            <span className="ai-social-architect__prediction-label">
              Taste Match
            </span>
          </div>
          <div className="ai-social-architect__prediction-card">
            <span className="ai-social-architect__prediction-number">
              {selectedGroupSize}
            </span>
            <span className="ai-social-architect__prediction-label">
              Grupo target
            </span>
          </div>
        </div>

        {/* Sensory */}
        {enriched.sensoryProfile && (
          <div className="ai-social-architect__sensory">
            <span className="ai-social-architect__section-label">
              Ambiente
            </span>
            <div className="ai-social-architect__sensory-grid">
              <span>🔅 {enriched.sensoryProfile.lighting.mood}</span>
              <span>🔊 {enriched.sensoryProfile.acoustics.reverberation}</span>
              <span>🌡 {enriched.sensoryProfile.temperature.base}°C</span>
              <span>🌸 {enriched.sensoryProfile.aroma}</span>
            </div>
          </div>
        )}

        {/* Social segments */}
        {proposal.cross_domain.member_segments.length > 0 && (
          <div className="ai-social-architect__segments">
            <span className="ai-social-architect__section-label">
              Segmentos target
            </span>
            <div className="ai-social-architect__segments-list">
              {proposal.cross_domain.member_segments.map((segment: string, idx: number) => (
                <span key={idx} className="ai-social-architect__segment-tag">
                  {segment}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cross-domain impact */}
        <div className="ai-social-architect__cross-domain">
          <span className="ai-social-architect__section-label">
            Impacto cross-domain
          </span>
          <div className="ai-social-architect__cross-domain-grid">
            {proposal.cross_domain.communication_messages.length > 0 && (
              <div className="ai-social-architect__cross-domain-item">
                <span className="ai-social-architect__cross-domain-icon">
                  📨
                </span>
                <span className="ai-social-architect__cross-domain-value">
                  {proposal.cross_domain.communication_messages[0]}
                </span>
              </div>
            )}
            {proposal.cross_domain.engagement_events.length > 0 && (
              <div className="ai-social-architect__cross-domain-item">
                <span className="ai-social-architect__cross-domain-icon">
                  🎭
                </span>
                <span className="ai-social-architect__cross-domain-value">
                  {proposal.cross_domain.engagement_events[0]}
                </span>
              </div>
            )}
            {proposal.cross_domain.finance_budget_estimate > 0 && (
              <div className="ai-social-architect__cross-domain-item">
                <span className="ai-social-architect__cross-domain-icon">
                  💰
                </span>
                <span className="ai-social-architect__cross-domain-value">
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
          <div className="ai-social-architect__steps">
            <span className="ai-social-architect__section-label">
              Plan de ejecución
            </span>
            <ol className="ai-social-architect__steps-list">
              {proposal.action_steps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Refinement */}
      <div className="ai-social-architect__refinement">
        <span className="ai-social-architect__section-label">
          Refinar intervención
        </span>
        <div className="ai-social-architect__refine-actions">
          <button
            className="ai-social-architect__btn ai-social-architect__btn--ghost"
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
            Grupo íntimo (-40%)
          </button>
          <button
            className="ai-social-architect__btn ai-social-architect__btn--ghost"
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
            Grupo amplio (+50%)
          </button>
          <button
            className="ai-social-architect__btn ai-social-architect__btn--ghost"
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
          </button>
        </div>
      </div>

      {/* Impact delta */}
      {lastImpactDelta && (
        <div
          className="ai-social-architect__impact-delta"
          style={{
            borderColor: lastImpactDelta.recommended
              ? '#4ade80'
              : '#ef4444',
          }}
        >
          <span className="ai-social-architect__impact-label">
            Impacto del cambio
          </span>
          <p className="ai-social-architect__impact-commentary">
            {lastImpactDelta.commentary}
          </p>
          <div className="ai-social-architect__impact-deltas">
            {lastImpactDelta.attendanceDelta !== 0 && (
              <span>
                Asistentes:{' '}
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
        <div className="ai-social-architect__risks">
          <span className="ai-social-architect__section-label">
            Riesgos
          </span>
          <div className="ai-social-architect__risks-list">
            {risks.map((risk, idx) => {
              const style = RISK_STYLES[risk.severity] ?? RISK_STYLES.low;
              return (
                <div
                  key={idx}
                  className="ai-social-architect__risk"
                  style={{
                    background: style.bg,
                    borderColor: style.color,
                  }}
                >
                  <div className="ai-social-architect__risk-header">
                    <span
                      className="ai-social-architect__risk-severity"
                      style={{ color: style.color }}
                    >
                      {risk.severity.toUpperCase()}
                    </span>
                    <span className="ai-social-architect__risk-type">
                      {risk.type}
                    </span>
                  </div>
                  <p className="ai-social-architect__risk-desc">
                    {risk.description}
                  </p>
                  <p className="ai-social-architect__risk-mitigation">
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
        <div className="ai-social-architect__warnings">
          {enriched.warnings.map((w, idx) => (
            <div key={idx} className="ai-social-architect__warning">
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {enriched.recommendations.length > 0 && (
        <div className="ai-social-architect__recommendations">
          {enriched.recommendations.map((r, idx) => (
            <div key={idx} className="ai-social-architect__recommendation">
              💡 {r}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="ai-social-architect__actions">
        <button
          className="ai-social-architect__btn ai-social-architect__btn--ghost"
          onClick={onReset}
        >
          Empezar de nuevo
        </button>
        <button
          className="ai-social-architect__btn ai-social-architect__btn--secondary"
          onClick={onRegenerate}
        >
          Regenerar
        </button>
        <button
          className="ai-social-architect__btn ai-social-architect__btn--primary"
          onClick={onConfirm}
          disabled={!readyToExecute}
        >
          {readyToExecute
            ? '🤝 Diseñar así'
            : `Bloqueado: ${blockers[0] ?? 'riesgos pendientes'}`}
        </button>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ══════════════════════════════════════════════════════════

/** Social metric card — single metric with icon and value. */
function SocialMetricCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="ai-social-architect__metric-card">
      <span className="ai-social-architect__metric-icon">{icon}</span>
      <div className="ai-social-architect__metric-info">
        <span className="ai-social-architect__metric-value">{value}</span>
        <span className="ai-social-architect__metric-label">{label}</span>
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
      return 'Diseñando intervención...';
    case 'refining':
      return 'Refinamiento';
    case 'confirmed':
      return 'Confirmado';
    default:
      return phase;
  }
}

function goalLabel(goal: string | null): string {
  if (!goal) return 'General';
  const found = SOCIAL_GOALS.find((g) => g.id === goal);
  return found ? found.label.split(' — ')[0] : goal;
}

function generateSocialCommentary(
  design: DesignResult,
  goal: string | null,
  groupSize: number,
): string {
  const parts: string[] = [];
  const { enriched, proposal } = design;

  // Goal-specific opening
  if (goal === 'bridging') {
    parts.push(
      `Esta intervención está diseñada para PUENTEAR clusters sociales separados. El grupo de ${groupSize} personas incluye perfiles de distintos segmentos para maximizar conexiones nuevas.`,
    );
  } else if (goal === 'inclusion') {
    parts.push(
      `Objetivo: INCLUIR socios aislados. El diseño prioriza ambientes acogedores y actividades de baja barrera de entrada para que todos participen cómodamente.`,
    );
  } else if (goal === 'bonding') {
    parts.push(
      `Esta intervención FORTALECE conexiones existentes entre socios que ya se conocen. El formato promueve conversaciones más profundas y experiencias compartidas.`,
    );
  } else if (goal === 'exploration') {
    parts.push(
      `Objetivo: EXPLORACIÓN social. Mezclamos perfiles que normalmente no interactúan para descubrir afinidades inesperadas.`,
    );
  } else {
    parts.push(
      `Intervención social para ${proposal.expected_impact.attendance_estimate} asistentes en grupos de ${groupSize}.`,
    );
  }

  // Venue
  if (enriched.venueMatch) {
    const v = enriched.venueMatch;
    if (v.matchScore >= 80) {
      parts.push(
        `"${v.venueName}" es ideal (${v.matchScore}% match) — su layout favorece la interacción social.`,
      );
    } else if (v.matchScore < 60) {
      parts.push(
        `"${v.venueName}" tiene match moderado (${v.matchScore}%). ${v.reasoning}`,
      );
    }
  }

  // Resonance
  const resonance = enriched.resonancePrediction;
  if (resonance >= 70) {
    parts.push(
      `Resonancia alta (${resonance}/100) — los socios van a salir con sensación de conexión genuina.`,
    );
  } else if (resonance < 50) {
    parts.push(
      `Resonancia baja (${resonance}/100). Considerar actividades con más estructura para facilitar la interacción.`,
    );
  }

  // Taste match
  const taste = enriched.tasteMatchScore;
  if (taste >= 70) {
    parts.push(
      `Taste match fuerte (${taste}%) — el formato social resuena con los intereses del público.`,
    );
  }

  return parts.join(' ');
}