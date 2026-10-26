// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Executive Brief (2027 NEW)
//
// "The Brief" — AI-generated narrative typed character-by-character.
// Agent-driven 3-state: dormant → processing → presenting.
//
// On load: synthesizes critical findings into 3-4 sentences.
// Types at 18ms/char, 600ms sentence gap. Cursor blink.
// If reduced motion: instant reveal, no typing.
//
// Glass namespace: .glass-reb
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Brain,
  ChevronRight,
  AlertTriangle,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

import type { RecommendationMode, OpportunitySynthesis } from "../types";
import { OPPORTUNITY_LEVEL_CONFIG, SIGNAL_SOURCE_CONFIG } from "../types";

import "./RecExecutiveBrief.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

type AgentState = "dormant" | "processing" | "presenting";

interface CriticalItems {
  criticalConflicts: unknown[];
  urgentRecommendations: unknown[];
  highConfidencePredictions: unknown[];
  highImpactPricings: unknown[];
  totalCriticalCount: number;
}

interface SynthesisHealth {
  score: number;
  label: "rich" | "moderate" | "sparse" | "empty";
  dataCoverage: number;
  signalStrength: number;
}

interface AdvisorOutput {
  insights: Array<{
    id: string;
    severity: string;
    title: string;
    description: string;
  }>;
  topInsights: Array<{
    id: string;
    severity: string;
    title: string;
    description: string;
  }>;
  hasHighSeverity: boolean;
  totalInsights: number;
  sourceContribution: {
    sources: string[];
    count: number;
    isFullPicture: boolean;
  };
}

interface RecExecutiveBriefProps {
  advisor: AdvisorOutput;
  mode: RecommendationMode;
  opportunities: OpportunitySynthesis[];
  criticalItems: CriticalItems;
  synthesisHealth: SynthesisHealth;
  reducedMotion: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// NARRATIVE BUILDER — Turns data into 3-4 human sentences
// ═══════════════════════════════════════════════════════════════════════

function buildNarrative(
  advisor: AdvisorOutput,
  opportunities: OpportunitySynthesis[],
  criticalItems: CriticalItems,
  _synthesisHealth: SynthesisHealth,
  mode: RecommendationMode,
): string {
  const sentences: string[] = [];

  // Sentence 1: System status
  const topOpp = opportunities[0];
  if (topOpp) {
    const levelLabel = OPPORTUNITY_LEVEL_CONFIG[topOpp.level].label.toLowerCase();
    sentences.push(
      `He identificado ${opportunities.length} oportunidad${opportunities.length > 1 ? "es" : ""} de las cuales la más significativa es ${levelLabel}: "${topOpp.title}".`,
    );
  } else if (advisor.totalInsights > 0) {
    sentences.push(
      `El motor de inteligencia ha procesado ${advisor.totalInsights} insight${advisor.totalInsights > 1 ? "s" : ""} basados en ${advisor.sourceContribution.count} fuentes de datos.`,
    );
  } else {
    sentences.push(
      "El motor de inteligencia está en modo de monitoreo continuo. No se detectan señales críticas en este momento.",
    );
  }

  // Sentence 2: Critical items (if any)
  if (criticalItems.totalCriticalCount > 0) {
    const parts: string[] = [];
    if (criticalItems.criticalConflicts.length > 0) {
      parts.push(
        `${criticalItems.criticalConflicts.length} conflicto${criticalItems.criticalConflicts.length > 1 ? "s" : ""} crítico${criticalItems.criticalConflicts.length > 1 ? "s" : ""}`,
      );
    }
    if (criticalItems.urgentRecommendations.length > 0) {
      parts.push(
        `${criticalItems.urgentRecommendations.length} recomendación urgente`,
      );
    }
    if (criticalItems.highImpactPricings.length > 0) {
      parts.push(
        `${criticalItems.highImpactPricings.length} oportunidad${criticalItems.highImpactPricings.length > 1 ? "es" : ""} de pricing`,
      );
    }
    sentences.push(
      `Se requiere atención inmediata: ${parts.join(", ")}.`,
    );
  }

  // Sentence 3: Cross-domain correlation
  const domainSources = [...new Set(opportunities.flatMap((o) => o.source_domains))];
  if (domainSources.length >= 2) {
    const domainNames = domainSources
      .slice(0, 3)
      .map((d) => SIGNAL_SOURCE_CONFIG[d]?.label ?? d);
    sentences.push(
      `Detecto correlación entre ${domainNames.join(", ")} — las oportunidades más fuertes emergen de la intersección entre dominios.`,
    );
  }

  // Sentence 4: Recommendation based on mode
  switch (mode) {
    case "act":
      sentences.push(
        "Recomiendo revisar la cola de acciones de inmediato. Hay tareas listas para ejecutarse y ventanas de oportunidad que están cerrándose.",
      );
      break;
    case "analyze":
      sentences.push(
        "Te sugiero explorar el lienzo de razonamiento y el simulador de revenue para evaluar las mejores jugadas antes de actuar.",
      );
      break;
    default:
      if (opportunities.length > 0) {
        sentences.push(
          "El radar de oportunidades muestra la distribución actual. Navegá por los paneles para profundizar en cada hallazgo.",
        );
      } else {
        sentences.push(
          "Todo indica estabilidad operativa. El sistema continuará monitoreando para detectar nuevas oportunidades.",
        );
      }
  }

  return sentences.join(" ");
}

// ═══════════════════════════════════════════════════════════════════════
// PROCESSING STEPS — Visual feedback during agent computation
// ═══════════════════════════════════════════════════════════════════════

const PROCESSING_STEPS = [
  { icon: Brain, label: "Analizando señales..." },
  { icon: Target, label: "Correlacionando dominios..." },
  { icon: TrendingUp, label: "Evaluando oportunidades..." },
  { icon: Zap, label: "Preparando síntesis..." },
];

// ═══════════════════════════════════════════════════════════════════════
// TYPING CONFIG
// ═══════════════════════════════════════════════════════════════════════

const CHAR_DELAY_MS = 18;
const SENTENCE_GAP_MS = 600;

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function RecExecutiveBrief({
  advisor,
  mode,
  opportunities,
  criticalItems,
  synthesisHealth,
  reducedMotion,
}: RecExecutiveBriefProps) {
  const [agentState, setAgentState] = useState<AgentState>("dormant");
  const [currentStep, setCurrentStep] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const stepTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const typeTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  // ── Build full narrative text ───────────────────────────────────────
  const fullNarrative = useMemo(
    () =>
      buildNarrative(
        advisor,
        opportunities,
        criticalItems,
        synthesisHealth,
        mode,
      ),
    [advisor, opportunities, criticalItems, synthesisHealth, mode],
  );

  // ── Start agent sequence on mount ───────────────────────────────────
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    // If reduced motion, skip straight to presenting with full text
    if (reducedMotion) {
      setAgentState("presenting");
      setDisplayedText(fullNarrative);
      setIsTypingComplete(true);
      return;
    }

    // Phase 1: Processing (staggered steps)
    setAgentState("processing");

    const stepDelay = 500;
    PROCESSING_STEPS.forEach((_, idx) => {
      const timer = setTimeout(() => {
        setCurrentStep(idx);
      }, idx * stepDelay);
      stepTimersRef.current.push(timer);
    });

    // Phase 2: Presenting (after processing completes)
    const processingCompleteTimer = setTimeout(() => {
      setAgentState("presenting");
      startTyping(fullNarrative);
    }, PROCESSING_STEPS.length * stepDelay + 300);

    stepTimersRef.current.push(processingCompleteTimer);

    return () => {
      stepTimersRef.current.forEach(clearTimeout);
      typeTimersRef.current.forEach(clearTimeout);
    };
  }, [fullNarrative, reducedMotion]);

  // ── Typing engine ───────────────────────────────────────────────────
  const startTyping = useCallback((text: string) => {
    let charIndex = 0;
    const typeNextChar = () => {
      if (charIndex >= text.length) {
        setIsTypingComplete(true);
        return;
      }

      const char = text[charIndex];
      const isSentenceEnd = char === "." || char === "!" || char === "?";
      const delay = isSentenceEnd ? SENTENCE_GAP_MS : CHAR_DELAY_MS;

      const timer = setTimeout(() => {
        charIndex++;
        setDisplayedText(text.slice(0, charIndex));
        typeNextChar();
      }, delay);

      typeTimersRef.current.push(timer);
    };

    typeNextChar();
  }, []);

  // ── Cleanup on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stepTimersRef.current.forEach(clearTimeout);
      typeTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div
      className="glass-reb"
      data-agent-state={agentState}
      data-mode={mode}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="reb-header">
        <Brain size={16} aria-hidden="true" className="reb-header-icon" />
        <span className="reb-header-title">Briefing Ejecutivo</span>
        {agentState === "presenting" && isTypingComplete && (
          <span className="reb-header-badge" data-health={synthesisHealth.label}>
            {synthesisHealth.label === "rich" ? "Síntesis completa" :
             synthesisHealth.label === "moderate" ? "Síntesis parcial" :
             synthesisHealth.label === "sparse" ? "Datos limitados" :
             "Sin datos"}
          </span>
        )}
      </div>

      {/* ── Dormant State ─────────────────────────────────────────────── */}
      {agentState === "dormant" && (
        <div className="reb-dormant">
          <span className="reb-dormant-text">
            Preparando síntesis de inteligencia...
          </span>
        </div>
      )}

      {/* ── Processing State ──────────────────────────────────────────── */}
      {agentState === "processing" && (
        <div className="reb-processing">
          {PROCESSING_STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            const isActive = idx === currentStep;
            const isDone = idx < currentStep;

            return (
              <div
                key={idx}
                className="reb-step"
                data-done={isDone ? "" : undefined}
                data-active={isActive ? "" : undefined}
                style={{ "--stagger-i": idx } as React.CSSProperties}
              >
                <div className="reb-step-indicator">
                  {isDone ? (
                    <ChevronRight size={12} aria-hidden="true" />
                  ) : (
                    <StepIcon size={12} aria-hidden="true" />
                  )}
                </div>
                <span className="reb-step-label">{step.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Presenting State ──────────────────────────────────────────── */}
      {agentState === "presenting" && (
        <div className="reb-narrative">
          <p className="reb-narrative-text">
            {displayedText}
            {!isTypingComplete && (
              <span className="reb-cursor" aria-hidden="true" />
            )}
          </p>

          {/* ── Key Metrics Strip ─────────────────────────────────────── */}
          {isTypingComplete && (
            <div className="reb-metrics">
              <div className="reb-metric" data-variant="opportunities">
                <Target size={13} aria-hidden="true" />
                <span className="reb-metric-value">{opportunities.length}</span>
                <span className="reb-metric-label">oportunidades</span>
              </div>
              <div className="reb-metric" data-variant="critical">
                <AlertTriangle size={13} aria-hidden="true" />
                <span className="reb-metric-value">{criticalItems.totalCriticalCount}</span>
                <span className="reb-metric-label">críticos</span>
              </div>
              <div className="reb-metric" data-variant="sources">
                <TrendingUp size={13} aria-hidden="true" />
                <span className="reb-metric-value">{advisor.sourceContribution.count}</span>
                <span className="reb-metric-label">fuentes</span>
              </div>
              <div className="reb-metric" data-variant="health">
                <Zap size={13} aria-hidden="true" />
                <span className="reb-metric-value">{synthesisHealth.dataCoverage}%</span>
                <span className="reb-metric-label">cobertura</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}