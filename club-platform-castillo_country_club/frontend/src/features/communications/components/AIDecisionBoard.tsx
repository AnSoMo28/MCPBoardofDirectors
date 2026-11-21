// src/features/communications/components/AIDecisionBoard.tsx
// ═══════════════════════════════════════════════════════════
// AI Decision Board — The War Room
// Castillo Country Club — Phase 31 "The Voice"
//
// Not a notification panel. Not a to-do list.
// A WAR ROOM where the AI presents its reasoning,
// proposes specific actions, simulates consequences,
// and waits for human approval.
//
// Three cascade panels:
//   THINKING  → What the AI is evaluating RIGHT NOW
//   PROPOSING → The recommended action with confidence
//   SIMULATING → Before/after: what happens if we act vs don't
//
// HITL (Human-in-the-Loop): critical decisions require
// human approval. The AI proposes, the human decides.
// The system learns from the decision.
//
// Pure React + SVG. Zero external dependencies.
// ═══════════════════════════════════════════════════════════

import { useMemo, useState, useCallback } from "react";
import {
  Brain, Zap, Eye, Shield, Check, Clock, SkipForward,
  Trash2, AlertTriangle, TrendingUp,
  TrendingDown, Target, ArrowRight,
} from "lucide-react";
import type {
  EmotionalTrajectory,
  SilenceProfile,
  MessageFatigue,
  NarrativeArc,
  CommunicationIntelligenceBriefing,
} from "../types";

import {
  deriveSilenceLevel,
  deriveEmotionalZone,
  EMOTIONAL_ZONE_CONFIG,
  SILENCE_LEVEL_CONFIG,
} from "../types";
import type { CommStreamItem } from "../hooks/useCommunicationDashboard";

import "./AIDecisionBoard.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// EXPORTED TYPES
// ═══════════════════════════════════════════════════════════

/**
 * A decision proposal — the AI's specific recommendation.
 * Includes what to do, how, when, and why.
 */
export interface DecisionProposal {
  id: string;
  action: string;
  channel: string;
  tone: string;
  timing: string;
  confidence: number;
  talkingPoints: string[];
  avoidTopics: string[];
  predictedOutcome: string;
  outcomeConfidence: number;
  consequenceOfInaction: string;
  daysToIrreversible: number | null;
}

/**
 * Simulation result — what happens if we act vs don't.
 */
export interface SimulationResult {
  ifAct: {
    description: string;
    predictedScore: number;
    predictedZone: string;
    probability: number;
  };
  ifIgnore: {
    description: string;
    predictedScore: number;
    predictedZone: string;
    probability: number;
    daysToEscape: number | null;
  };
}

/**
 * Decision action — what the human chose to do.
 */
export type DecisionAction = "approve" | "postpone" | "delegate" | "discard" | "modify";

// ═══════════════════════════════════════════════════════════
// PRIVATE HELPERS
// ═══════════════════════════════════════════════════════════

/** Build thinking evaluation steps from available data. */
function buildThinkingSteps(
  briefing: CommunicationIntelligenceBriefing | null,
  trajectory: EmotionalTrajectory | null,
  silence: SilenceProfile | null,
  fatigue: MessageFatigue | null,
  narrative: NarrativeArc | null,
  disengagementRisk: number,
): Array<{ id: string; label: string; detail: string; status: "complete" | "active" | "pending" }> {
  const steps: Array<{ id: string; label: string; detail: string; status: "complete" | "active" | "pending" }> = [];

  // Step 1: Emotional analysis
  if (trajectory) {
    const zone = deriveEmotionalZone(trajectory.current.score);
    steps.push({
      id: "eval-emotion",
      label: "Análisis emocional",
      detail: `${EMOTIONAL_ZONE_CONFIG[zone].label} (${trajectory.current.score}/100), ${trajectory.trajectory === "descending" ? "↘ descendiendo" : trajectory.trajectory === "ascending" ? "↗ ascendiendo" : "→ estable"}`,
      status: "complete",
    });
  }

  // Step 2: Silence analysis
  if (silence) {
    const level = deriveSilenceLevel(silence.current_silence_days);
    steps.push({
      id: "eval-silence",
      label: "Evaluación de silencio",
      detail: `${silence.current_silence_days}d sin contacto — ${SILENCE_LEVEL_CONFIG[level].label}`,
      status: silence.current_silence_days > 7 ? "complete" : "active",
    });
  }

  // Step 3: Fatigue check
  if (fatigue) {
    steps.push({
      id: "eval-fatigue",
      label: "Verificación de fatiga",
      detail: `${Math.round(fatigue.current_level * 100)}% — ${fatigue.messages_received_7d} mensajes en 7d`,
      status: "complete",
    });
  }

  // Step 4: Narrative context
  if (narrative) {
    steps.push({
      id: "eval-narrative",
      label: "Contexto narrativo",
      detail: `${narrative.chapters.length} capítulos, ${narrative.open_callbacks.length} compromisos pendientes`,
      status: "complete",
    });
  }

  // Step 5: Risk assessment
  steps.push({
    id: "eval-risk",
    label: "Evaluación de riesgo",
    detail: `Desengagement: ${Math.round(disengagementRisk * 100)}%`,
    status: "active",
  });

  // Step 6: Channel selection (pending until proposal)
  steps.push({
    id: "eval-channel",
    label: "Selección de canal óptimo",
    detail: briefing ? `Recomendado: ${briefing.recommended_channel}` : "Evaluando...",
    status: briefing ? "complete" : "pending",
  });

  return steps;
}

/** Build a simulation from trajectory + silence + briefing data. */
function buildSimulation(
  trajectory: EmotionalTrajectory | null,
  silence: SilenceProfile | null,
  briefing: CommunicationIntelligenceBriefing | null,
  disengagementRisk: number,
): SimulationResult {
  const currentScore = trajectory?.current.score ?? 50;
  const silenceDays = silence?.current_silence_days ?? 0;
  const velocity = trajectory?.velocity ?? 0;

  // If we act: improve trajectory, reduce silence
  const actImprovement = Math.min(15, Math.max(3, Math.abs(velocity) * 2));
  const actScore = Math.min(100, currentScore + actImprovement);
  const actZone = deriveEmotionalZone(actScore);

  // If we ignore: trajectory worsens, silence extends
  const ignoreDecline = Math.min(20, Math.max(5, Math.abs(velocity) * 3 + silenceDays * 0.3));
  const ignoreScore = Math.max(0, currentScore - ignoreDecline);
  const ignoreZone = deriveEmotionalZone(ignoreScore);

  const daysToEscape = silence
    ? Math.max(0, 60 - silenceDays)
    : null;

  return {
    ifAct: {
      description: briefing
        ? `Contacto por ${briefing.recommended_channel} con tono ${briefing.recommended_tone}`
        : "Contacto proactivo con el socio",
      predictedScore: Math.round(actScore),
      predictedZone: EMOTIONAL_ZONE_CONFIG[actZone].label,
      probability: Math.round(Math.max(0.3, 1 - disengagementRisk) * 100),
    },
    ifIgnore: {
      description: `Sin acción — silencio se extiende a ${silenceDays + 14}+ días`,
      predictedScore: Math.round(ignoreScore),
      predictedZone: EMOTIONAL_ZONE_CONFIG[ignoreZone].label,
      probability: Math.round(Math.max(0.3, disengagementRisk) * 100),
      daysToEscape,
    },
  };
}

/** Build a decision proposal from briefing + simulation. */
function buildProposal(
  briefing: CommunicationIntelligenceBriefing | null,
  simulation: SimulationResult,
  disengagementRisk: number,
): DecisionProposal | null {
  if (!briefing) return null;

  const urgency = briefing.intervention_urgency;

  return {
    id: `proposal-${Date.now()}`,
    action: urgency === "critical"
      ? "Llamada personal inmediata"
      : urgency === "high"
        ? "Mensaje personalizado hoy"
        : urgency === "medium"
          ? "Comunicación programada esta semana"
          : "Contacto en próximo ciclo",
    channel: briefing.recommended_channel,
    tone: briefing.recommended_tone,
    timing: briefing.recommended_timing,
    confidence: Math.round((1 - disengagementRisk) * 100),
    talkingPoints: briefing.talking_points,
    avoidTopics: briefing.avoid_topics,
    predictedOutcome: simulation.ifAct.description,
    outcomeConfidence: simulation.ifAct.probability,
    consequenceOfInaction: simulation.ifIgnore.description,
    daysToIrreversible: simulation.ifIgnore.daysToEscape,
  };
}

// ═══════════════════════════════════════════════════════════
// CONFIDENCE GAUGE — SVG semicircle
// ═══════════════════════════════════════════════════════════

function ConfidenceGauge({ value, label }: { value: number; label: string }) {
  const radius = 28;
  const circumference = Math.PI * radius; // semicircle
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="decision-gauge">
      <svg viewBox="0 0 70 40" className="decision-gauge__svg">
        {/* Background arc */}
        <path
          d="M 5 38 A 28 28 0 0 1 65 38"
          className="decision-gauge__bg"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d="M 5 38 A 28 28 0 0 1 65 38"
          className="decision-gauge__fill"
          data-confidence={value >= 70 ? "high" : value >= 40 ? "medium" : "low"}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
        />
        {/* Value text */}
        <text
          x="35"
          y="34"
          className="decision-gauge__value"
          textAnchor="middle"
          data-confidence={value >= 70 ? "high" : value >= 40 ? "medium" : "low"}
        >
          {value}%
        </text>
      </svg>
      <span className="decision-gauge__label">{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

interface AIDecisionBoardProps {
  briefing: CommunicationIntelligenceBriefing | null;
  trajectory: EmotionalTrajectory | null;
  silence: SilenceProfile | null;
  fatigue: MessageFatigue | null;
  narrative: NarrativeArc | null;
  streamItems: CommStreamItem[];
  disengagementRisk: number;
  onAction?: (action: DecisionAction, proposalId: string) => void;
}

export function AIDecisionBoard({
  briefing,
  trajectory,
  silence,
  fatigue,
  narrative,
  streamItems,
  disengagementRisk,
  onAction,
}: AIDecisionBoardProps) {
  // ── Action feedback state ─────────────────────────────
  const [lastAction, setLastAction] = useState<{
    action: DecisionAction;
    timestamp: number;
  } | null>(null);

  // ── Derived intelligence ──────────────────────────────
  const thinkingSteps = useMemo(
    () => buildThinkingSteps(briefing, trajectory, silence, fatigue, narrative, disengagementRisk),
    [briefing, trajectory, silence, fatigue, narrative, disengagementRisk],
  );

  const simulation = useMemo(
    () => buildSimulation(trajectory, silence, briefing, disengagementRisk),
    [trajectory, silence, briefing, disengagementRisk],
  );

  const proposal = useMemo(
    () => buildProposal(briefing, simulation, disengagementRisk),
    [briefing, simulation, disengagementRisk],
  );

  const urgency = briefing?.intervention_urgency ?? "none";

  // ── Action handlers ───────────────────────────────────
  const handleAction = useCallback(
    (action: DecisionAction) => {
      if (!proposal) return;
      setLastAction({ action, timestamp: Date.now() });
      onAction?.(action, proposal.id);
    },
    [proposal, onAction],
  );

  // ── Empty state ───────────────────────────────────────
  if (!briefing && streamItems.length === 0) {
    return (
      <div className="glass-comm-decisions" data-urgency="none">
        <div className="decision-board__header">
          <Brain size={16} />
          <span className="decision-board__title">Mesa de Decisiones</span>
        </div>
        <div className="decision-board__empty">
          <Shield size={32} className="decision-board__empty-icon" />
          <span>Sin decisiones pendientes — ecosistema en equilibrio</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-comm-decisions"
      data-urgency={urgency}
    >
      {/* ── Header ───────────────────────────────────── */}
      <div className="decision-board__header">
        <div className="decision-board__header-left">
          <Brain size={16} />
          <span className="decision-board__title">Mesa de Decisiones</span>
        </div>
        <div
          className="decision-board__urgency-badge"
          data-urgency={urgency}
        >
          <Shield size={12} />
          <span>
            {urgency === "none" ? "Sin urgencia" :
             urgency === "low" ? "Baja" :
             urgency === "medium" ? "Media" :
             urgency === "high" ? "Alta" : "Crítica"}
          </span>
        </div>
      </div>

      {/* ── Three cascade panels ─────────────────────── */}
      <div className="decision-board__cascade">

        {/* Panel 1: THINKING ─────────────────────────── */}
        <div className="decision-panel" data-panel="thinking">
          <div className="decision-panel__header">
            <Eye size={14} />
            <span>Pensando</span>
          </div>
          <div className="decision-panel__body">
            {thinkingSteps.map((step, i) => (
              <div
                key={step.id}
                className="thinking-step"
                data-status={step.status}
                style={{ "--stagger-i": i } as React.CSSProperties}
              >
                <div className="thinking-step__indicator" data-status={step.status}>
                  {step.status === "complete" ? (
                    <Check size={10} />
                  ) : step.status === "active" ? (
                    <div className="thinking-step__spinner" />
                  ) : (
                    <div className="thinking-step__dot" />
                  )}
                </div>
                <div className="thinking-step__content">
                  <span className="thinking-step__label">{step.label}</span>
                  <span className="thinking-step__detail">{step.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Arrow connector */}
        <div className="decision-board__arrow" data-active={!!proposal}>
          <ArrowRight size={18} />
        </div>

        {/* Panel 2: PROPOSING ────────────────────────── */}
        <div className="decision-panel" data-panel="proposing">
          <div className="decision-panel__header">
            <Zap size={14} />
            <span>Propuesta</span>
          </div>
          <div className="decision-panel__body">
            {proposal ? (
              <>
                {/* Action */}
                <div className="proposal-row">
                  <span className="proposal-label">Acción</span>
                  <span className="proposal-value proposal-value--action" data-urgency={urgency}>
                    {proposal.action}
                  </span>
                </div>

                {/* Channel + Tone */}
                <div className="proposal-dual">
                  <div className="proposal-row">
                    <span className="proposal-label">Canal</span>
                    <span className="proposal-value">{proposal.channel}</span>
                  </div>
                  <div className="proposal-row">
                    <span className="proposal-label">Tono</span>
                    <span className="proposal-value">{proposal.tone}</span>
                  </div>
                </div>

                {/* Timing */}
                <div className="proposal-row">
                  <span className="proposal-label">Timing</span>
                  <span className="proposal-value">{proposal.timing}</span>
                </div>

                {/* Talking points */}
                {proposal.talkingPoints.length > 0 && (
                  <div className="proposal-points">
                    <span className="proposal-label">Puntos clave</span>
                    <ul className="proposal-points__list">
                      {proposal.talkingPoints.slice(0, 3).map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Avoid topics */}
                {proposal.avoidTopics.length > 0 && (
                  <div className="proposal-avoid">
                    <AlertTriangle size={12} />
                    <span>Evitar: {proposal.avoidTopics.join(", ")}</span>
                  </div>
                )}

                {/* Confidence gauges */}
                <div className="proposal-gauges">
                  <ConfidenceGauge
                    value={proposal.confidence}
                    label="Confianza"
                  />
                  <ConfidenceGauge
                    value={proposal.outcomeConfidence}
                    label="Resultado"
                  />
                </div>

                {/* Days to irreversible */}
                {proposal.daysToIrreversible !== null && proposal.daysToIrreversible <= 14 && (
                  <div className="proposal-countdown" data-critical={proposal.daysToIrreversible <= 5}>
                    <Clock size={12} />
                    <span>
                      {proposal.daysToIrreversible <= 0
                        ? "Punto de no retorno alcanzado"
                        : `${proposal.daysToIrreversible} días hasta punto de no retorno`}
                    </span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="proposal-actions">
                  <Button
                    variant="unstyled"
                    className="proposal-action-btn"
                    data-action="approve"
                    onClick={() => handleAction("approve")}
                  >
                    <Check size={14} />
                    <span>Aprobar</span>
                  </Button>
                  <Button
                    variant="unstyled"
                    className="proposal-action-btn"
                    data-action="postpone"
                    onClick={() => handleAction("postpone")}
                  >
                    <Clock size={14} />
                    <span>Posponer</span>
                  </Button>
                  <Button
                    variant="unstyled"
                    className="proposal-action-btn"
                    data-action="delegate"
                    onClick={() => handleAction("delegate")}
                  >
                    <SkipForward size={14} />
                    <span>Delegar</span>
                  </Button>
                  <Button
                    variant="unstyled"
                    className="proposal-action-btn"
                    data-action="discard"
                    onClick={() => handleAction("discard")}
                  >
                    <Trash2 size={14} />
                    <span>Descartar</span>
                  </Button>
                </div>
              </>
            ) : (
              <div className="decision-panel__empty">
                Sin propuesta disponible
              </div>
            )}
          </div>
        </div>

        {/* Arrow connector */}
        <div className="decision-board__arrow" data-active={!!proposal}>
          <ArrowRight size={18} />
        </div>

        {/* Panel 3: SIMULATING ───────────────────────── */}
        <div className="decision-panel" data-panel="simulating">
          <div className="decision-panel__header">
            <Target size={14} />
            <span>Simulación</span>
          </div>
          <div className="decision-panel__body">
            {proposal ? (
              <>
                {/* If ACT */}
                <div className="simulation-scenario" data-scenario="act">
                  <div className="simulation-scenario__header">
                    <TrendingUp size={14} />
                    <span>Si actuamos</span>
                  </div>
                  <div className="simulation-scenario__body">
                    <span className="simulation-scenario__desc">
                      {simulation.ifAct.description}
                    </span>
                    <div className="simulation-metrics">
                      <div className="simulation-metric">
                        <span className="simulation-metric__value" data-direction="up">
                          {simulation.ifAct.predictedScore}
                        </span>
                        <span className="simulation-metric__label">Score</span>
                      </div>
                      <div className="simulation-metric">
                        <span className="simulation-metric__value">
                          {simulation.ifAct.predictedZone}
                        </span>
                        <span className="simulation-metric__label">Zona</span>
                      </div>
                      <div className="simulation-metric">
                        <span className="simulation-metric__value" data-direction="up">
                          {simulation.ifAct.probability}%
                        </span>
                        <span className="simulation-metric__label">Probabilidad</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* If IGNORE */}
                <div className="simulation-scenario" data-scenario="ignore">
                  <div className="simulation-scenario__header">
                    <TrendingDown size={14} />
                    <span>Si ignoramos</span>
                  </div>
                  <div className="simulation-scenario__body">
                    <span className="simulation-scenario__desc">
                      {simulation.ifIgnore.description}
                    </span>
                    <div className="simulation-metrics">
                      <div className="simulation-metric">
                        <span className="simulation-metric__value" data-direction="down">
                          {simulation.ifIgnore.predictedScore}
                        </span>
                        <span className="simulation-metric__label">Score</span>
                      </div>
                      <div className="simulation-metric">
                        <span className="simulation-metric__value">
                          {simulation.ifIgnore.predictedZone}
                        </span>
                        <span className="simulation-metric__label">Zona</span>
                      </div>
                      <div className="simulation-metric">
                        <span className="simulation-metric__value" data-direction="down">
                          {simulation.ifIgnore.probability}%
                        </span>
                        <span className="simulation-metric__label">Probabilidad</span>
                      </div>
                    </div>
                    {simulation.ifIgnore.daysToEscape !== null && (
                      <div className="simulation-escape">
                        <AlertTriangle size={12} />
                        <span>
                          Escape en ~{simulation.ifIgnore.daysToEscape} días
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="decision-panel__empty">
                Sin simulación disponible
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Action feedback ──────────────────────────── */}
      {lastAction && (
        <div
          className="decision-board__feedback"
          data-action={lastAction.action}
        >
          {lastAction.action === "approve" && (
            <>
              <Check size={14} />
              <span>Acción aprobada — ejecutando...</span>
            </>
          )}
          {lastAction.action === "postpone" && (
            <>
              <Clock size={14} />
              <span>Acción pospuesta — reagendando...</span>
            </>
          )}
          {lastAction.action === "delegate" && (
            <>
              <SkipForward size={14} />
              <span>Acción delegada — notificando al staff...</span>
            </>
          )}
          {lastAction.action === "discard" && (
            <>
              <Trash2 size={14} />
              <span>Propuesta descartada</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}