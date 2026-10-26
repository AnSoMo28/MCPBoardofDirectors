// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Reasoning Canvas (2027 NEW)
//
// "The Rationale" — Shows the AI's work for each top opportunity.
//
// Each opportunity renders as a horizontal reasoning chain:
//   [DATA] → [INFERENCE] → [ACTION] → [OUTCOME]
//
// Steps reveal sequentially with stagger. Each step has:
//   - Type icon (Database, Brain, Target, TrendingUp)
//   - Label + description
//   - Confidence bar (0-100)
//   - Source domain indicator (if cross-domain step)
//
// Top 3 opportunities displayed. Expandable to see all.
//
// Glass namespace: .glass-rrc
// ═══════════════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import {
  Database,
  Brain,
  Target,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Link2,
  Lightbulb,
} from "lucide-react";

import type { OpportunitySynthesis, ReasoningStep } from "../types";
import {
  ReasoningStepType,
  REASONING_STEP_CONFIG,
  OPPORTUNITY_LEVEL_CONFIG,
  SIGNAL_SOURCE_CONFIG,
} from "../types";

import "./RecReasoningCanvas.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface RecReasoningCanvasProps {
  opportunities: OpportunitySynthesis[];
  reducedMotion: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// STEP ICON RESOLVER
// ═══════════════════════════════════════════════════════════════════════

const STEP_ICONS: Record<ReasoningStepType, typeof Database> = {
  [ReasoningStepType.Data]: Database,
  [ReasoningStepType.Inference]: Brain,
  [ReasoningStepType.Action]: Target,
  [ReasoningStepType.Outcome]: TrendingUp,
};

// ═══════════════════════════════════════════════════════════════════════
// SINGLE REASONING STEP
// ═══════════════════════════════════════════════════════════════════════

interface StepCardProps {
  step: ReasoningStep;
  index: number;
  totalSteps: number;
  reducedMotion: boolean;
  opportunityIndex: number;
}

function StepCard({
  step,
  index,
  totalSteps,
  reducedMotion,
  opportunityIndex,
}: StepCardProps) {
  const config = REASONING_STEP_CONFIG[step.type];
  const Icon = STEP_ICONS[step.type];
  const isLast = index === totalSteps - 1;
  const delayMs = reducedMotion
    ? 0
    : (opportunityIndex * 300) + (index * 150);

  return (
    <div
      className="rrc-step"
      data-reasoning-step={step.type}
      style={
        {
          "--stagger-i": index,
          "--step-delay": `${delayMs}ms`,
        } as React.CSSProperties
      }
    >
      {/* ── Step icon ──────────────────────────────────────────────────── */}
      <div className="rrc-step-icon-wrap">
        <div
          className="rrc-step-icon"
          style={{ color: config.color } as React.CSSProperties}
        >
          <Icon size={16} aria-hidden="true" />
        </div>
        {!isLast && (
          <div className="rrc-step-connector" aria-hidden="true" />
        )}
      </div>

      {/* ── Step content ───────────────────────────────────────────────── */}
      <div className="rrc-step-content">
        <div className="rrc-step-header">
          <span
            className="rrc-step-type-badge"
            style={{ color: config.color } as React.CSSProperties}
          >
            {config.label}
          </span>
          {/* Source domain indicator (for cross-domain data steps) */}
          {step.source_domain && (
            <span
              className="rrc-step-domain"
              data-signal-source={step.source_domain}
            >
              {SIGNAL_SOURCE_CONFIG[step.source_domain]?.label ?? step.source_domain}
            </span>
          )}
        </div>

        <h4 className="rrc-step-label">{step.label}</h4>
        <p className="rrc-step-desc">{step.description}</p>

        {/* ── Confidence bar ───────────────────────────────────────────── */}
        <div className="rrc-confidence">
          <div className="rrc-confidence-track">
            <div
              className="rrc-confidence-fill"
              style={
                {
                  "--confidence-pct": `${step.confidence}%`,
                  "--confidence-delay": `${delayMs + 200}ms`,
                } as React.CSSProperties
              }
              data-confidence-level={
                step.confidence >= 80
                  ? "high"
                  : step.confidence >= 50
                    ? "medium"
                    : "low"
              }
            />
          </div>
          <span className="rrc-confidence-label">{step.confidence}%</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// REASONING CHAIN — Full chain for one opportunity
// ═══════════════════════════════════════════════════════════════════════

interface ChainCardProps {
  opportunity: OpportunitySynthesis;
  index: number;
  reducedMotion: boolean;
}

function ChainCard({ opportunity, index, reducedMotion }: ChainCardProps) {
  const levelConfig = OPPORTUNITY_LEVEL_CONFIG[opportunity.level];
  const chain = opportunity.reasoning_chain;
  const delayMs = reducedMotion ? 0 : index * 300;

  return (
    <div
      className="rrc-chain"
      data-opportunity-level={opportunity.level}
      style={
        {
          "--chain-delay": `${delayMs}ms`,
        } as React.CSSProperties
      }
    >
      {/* ── Chain header ───────────────────────────────────────────────── */}
      <div className="rrc-chain-header">
        <div className="rrc-chain-meta">
          <span className="rrc-chain-score" data-level={opportunity.level}>
            {opportunity.score}
          </span>
          <span
            className="rrc-chain-level"
            style={{ color: levelConfig.color } as React.CSSProperties}
          >
            {levelConfig.label}
          </span>
        </div>
        <h3 className="rrc-chain-title">{opportunity.title}</h3>
        <p className="rrc-chain-summary">{chain.summary}</p>

        {/* Domain tags */}
        <div className="rrc-chain-domains">
          {opportunity.source_domains.map((d) => (
            <span
              key={d}
              className="rrc-chain-domain-tag"
              data-signal-source={d}
            >
              {SIGNAL_SOURCE_CONFIG[d]?.label ?? d}
            </span>
          ))}
        </div>

        {/* Overall confidence */}
        <div className="rrc-chain-overall">
          <Link2 size={12} aria-hidden="true" />
          <span className="rrc-chain-overall-label">
            Confianza general:
          </span>
          <span
            className="rrc-chain-overall-value"
            data-confidence-level={
              chain.overall_confidence >= 80
                ? "high"
                : chain.overall_confidence >= 50
                  ? "medium"
                  : "low"
            }
          >
            {chain.overall_confidence}%
          </span>
        </div>
      </div>

      {/* ── Steps ──────────────────────────────────────────────────────── */}
      <div className="rrc-chain-steps">
        {chain.steps.map((step, stepIdx) => (
          <StepCard
            key={`${step.type}-${stepIdx}`}
            step={step}
            index={stepIdx}
            totalSteps={chain.steps.length}
            reducedMotion={reducedMotion}
            opportunityIndex={index}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function RecReasoningCanvas({
  opportunities,
  reducedMotion,
  className,
}: RecReasoningCanvasProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter to opportunities that have reasoning chains
  const withChains = opportunities.filter(
    (o) => o.reasoning_chain && o.reasoning_chain.steps.length > 0,
  );

  const visibleCount = isExpanded ? withChains.length : 3;
  const visibleOpps = withChains.slice(0, visibleCount);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // ── Empty state ─────────────────────────────────────────────────────
  if (withChains.length === 0) {
    return (
      <div className={`glass-rrc ${className ?? ""}`} data-empty>
        <div className="rrc-header">
          <Brain size={16} aria-hidden="true" className="rrc-header-icon" />
          <span className="rrc-header-title">Lienzo de Razonamiento</span>
        </div>
        <div className="rrc-empty">
          <Lightbulb
            size={32}
            aria-hidden="true"
            className="rrc-empty-icon"
          />
          <p className="rrc-empty-text">
            Sin cadenas de razonamiento disponibles. Ejecutá la síntesis para
            generar inferencias a partir de los datos del sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-rrc ${className ?? ""}`}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="rrc-header">
        <Brain size={16} aria-hidden="true" className="rrc-header-icon" />
        <span className="rrc-header-title">Lienzo de Razonamiento</span>
        <span className="rrc-header-count">{withChains.length} cadenas</span>
      </div>

      {/* ── Chains ────────────────────────────────────────────────────── */}
      <div className="rrc-body">
        {visibleOpps.map((opp, idx) => (
          <ChainCard
            key={opp.id}
            opportunity={opp}
            index={idx}
            reducedMotion={reducedMotion}
          />
        ))}

        {/* ── Expand/collapse ──────────────────────────────────────────── */}
        {withChains.length > 3 && (
          <button
            type="button"
            className="rrc-expand-btn"
            onClick={handleToggle}
          >
            {isExpanded ? (
              <>
                <ChevronUp size={14} aria-hidden="true" />
                <span>Colapsar</span>
              </>
            ) : (
              <>
                <ChevronDown size={14} aria-hidden="true" />
                <span>Ver {withChains.length - 3} cadenas más</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}