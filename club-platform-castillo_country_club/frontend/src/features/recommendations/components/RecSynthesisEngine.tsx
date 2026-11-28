// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Synthesis Engine (2027 NEW)
//
// "The Mind" — Agent-driven 3-state cross-domain synthesis visualization.
//
// dormant:   Single trigger card "Ready to synthesize"
// processing: Step-by-step correlation animation (6 steps)
// presenting: SVG node graph + opportunity cards + health gauge
//
// SVG node graph: domain nodes in radial layout, weighted edges
// between correlated domains. Opportunity blips at edge midpoints.
//
// Glass namespace: .glass-rse
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Brain,
  ChevronRight,
  Play,
  RefreshCw,
  Activity,
  Link2,
  Sparkles,
  Layers,
  CheckCircle2,
} from "lucide-react";
import type { OpportunitySynthesis } from "../types";
import {
  SignalSource,
  SIGNAL_SOURCE_CONFIG,
  OPPORTUNITY_LEVEL_CONFIG,
} from "../types";

import "./RecSynthesisEngine.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

type AgentState = "dormant" | "processing" | "presenting";

interface CrossDomainSummary {
  source: SignalSource;
  signalCount: number;
  topSignal: string;
  urgency: number;
}

interface SynthesisHealth {
  score: number;
  label: "rich" | "moderate" | "sparse" | "empty";
  dataCoverage: number;
  signalStrength: number;
}

interface RecSynthesisEngineProps {
  isSynthesizing: boolean;
  onTrigger: () => void;
  opportunities: OpportunitySynthesis[];
  crossDomainSummaries: CrossDomainSummary[];
  totalSignals: number;
  totalCorrelations: number;
  health: SynthesisHealth;
  reducedMotion: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// PROCESSING STEPS
// ═══════════════════════════════════════════════════════════════════════

const PROCESSING_STEPS = [
  { icon: Activity, label: "Recopilando señales de 7 dominios..." },
  { icon: Link2, label: "Detectando correlaciones entre dominios..." },
  { icon: Brain, label: "Evaluando patrones conocidos..." },
  { icon: Layers, label: "Clasificando oportunidades..." },
  { icon: Sparkles, label: "Generando cadenas de razonamiento..." },
  { icon: CheckCircle2, label: "Síntesis completa — resultados listos" },
];

// ═══════════════════════════════════════════════════════════════════════
// SVG NODE GRAPH LAYOUT — Radial positions for domain nodes
// ═══════════════════════════════════════════════════════════════════════

const SVG_SIZE = 320;
const CENTER = SVG_SIZE / 2;
const NODE_RADIUS = 120;

const DOMAIN_NODES: Array<{
  source: SignalSource;
  angle: number; // degrees
}> = [
  { source: SignalSource.Wellness, angle: 270 },   // top
  { source: SignalSource.Events, angle: 330 },      // top-right
  { source: SignalSource.Finance, angle: 30 },       // bottom-right
  { source: SignalSource.Sports, angle: 90 },        // bottom
  { source: SignalSource.Families, angle: 150 },     // bottom-left
  { source: SignalSource.Internal, angle: 210 },     // top-left
];

function getNodePosition(angleDeg: number): { x: number; y: number } {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + NODE_RADIUS * Math.cos(angleRad),
    y: CENTER + NODE_RADIUS * Math.sin(angleRad),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// EDGE BUILDER — Weighted connections between active domains
// ═══════════════════════════════════════════════════════════════════════

interface GraphEdge {
  from: SignalSource;
  to: SignalSource;
  weight: number; // 0-1
  opportunityCount: number;
}

function buildEdges(opportunities: OpportunitySynthesis[]): GraphEdge[] {
  const edgeMap = new Map<string, GraphEdge>();

  for (const opp of opportunities) {
    const domains = opp.source_domains;
    for (let i = 0; i < domains.length; i++) {
      for (let j = i + 1; j < domains.length; j++) {
        const key = [domains[i], domains[j]].sort().join("↔");
        const existing = edgeMap.get(key);
        if (existing) {
          existing.weight = Math.min(1, existing.weight + 0.15);
          existing.opportunityCount++;
        } else {
          edgeMap.set(key, {
            from: domains[i],
            to: domains[j],
            weight: 0.4,
            opportunityCount: 1,
          });
        }
      }
    }
  }

  return [...edgeMap.values()];
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function RecSynthesisEngine({
  isSynthesizing,
  onTrigger,
  opportunities,
  crossDomainSummaries,
  totalSignals,
  totalCorrelations,
  health,
  reducedMotion,
}: RecSynthesisEngineProps) {
  const [agentState, setAgentState] = useState<AgentState>("dormant");
  const [currentStep, setCurrentStep] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const stepTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  // ── Build graph data ────────────────────────────────────────────────
  const edges = useMemo(() => buildEdges(opportunities), [opportunities]);

  const activeDomains = useMemo(
    () =>
      new Set(
        crossDomainSummaries
          .filter((s) => s.signalCount > 0)
          .map((s) => s.source),
      ),
    [crossDomainSummaries],
  );

  // ── Agent state machine ─────────────────────────────────────────────
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (opportunities.length === 0 && !isSynthesizing) {
      setAgentState("dormant");
      hasProcessed.current = false;
      return;
    }

    if (isSynthesizing && agentState !== "processing") {
      setAgentState("processing");
      setCurrentStep(0);

      // Cleanup previous timers
      stepTimersRef.current.forEach(clearTimeout);
      stepTimersRef.current = [];

      PROCESSING_STEPS.forEach((_, idx) => {
        const timer = setTimeout(() => {
          setCurrentStep(idx);
        }, idx * 450);
        stepTimersRef.current.push(timer);
      });

      return () => {
        stepTimersRef.current.forEach(clearTimeout);
      };
    }

    if (!isSynthesizing && opportunities.length > 0 && !hasProcessed.current) {
      hasProcessed.current = true;

      const timer = setTimeout(() => {
        setAgentState("presenting");
      }, reducedMotion ? 0 : 200);
      stepTimersRef.current.push(timer);

      return () => {
        stepTimersRef.current.forEach(clearTimeout);
      };
    }
  }, [isSynthesizing, opportunities.length, reducedMotion, agentState]);

  // ── Retry handler ───────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    hasProcessed.current = false;
    setAgentState("dormant");
    setCurrentStep(0);
    onTrigger();
  }, [onTrigger]);

  // ── Cleanup ─────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stepTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div
      className="glass-rse"
      data-agent-state={agentState}
      data-expanded={isExpanded ? "" : undefined}
      data-health={health.label}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="rse-header">
        <Brain size={16} aria-hidden="true" className="rse-header-icon" />
        <span className="rse-header-title">Motor de Síntesis</span>
        {agentState === "presenting" && (
          <span className="rse-header-stats">
            {totalSignals} señales · {totalCorrelations} correlaciones ·{" "}
            {opportunities.length} oportunidades
          </span>
        )}
      </div>

      {/* ── Dormant State ─────────────────────────────────────────────── */}
      {agentState === "dormant" && (
        <div className="rse-dormant">
          <div className="rse-dormant-visual">
            <div className="rse-dormant-orb" aria-hidden="true" />
            <Brain size={32} aria-hidden="true" className="rse-dormant-icon" />
          </div>
          <p className="rse-dormant-text">
            Motor de síntesis listo. Detecta correlaciones entre bienestar,
            eventos, finanzas, deportes y familias.
          </p>
          <Button
            variant="unstyled"
            type="button"
            className="rse-trigger-btn"
            onClick={onTrigger}
          >
            <Play size={14} aria-hidden="true" />
            <span>Iniciar Síntesis</span>
          </Button>
        </div>
      )}

      {/* ── Processing State ──────────────────────────────────────────── */}
      {agentState === "processing" && (
        <div className="rse-processing">
          {PROCESSING_STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            const isActive = idx === currentStep;
            const isDone = idx < currentStep;

            return (
              <div
                key={idx}
                className="rse-step"
                data-done={isDone ? "" : undefined}
                data-active={isActive ? "" : undefined}
                style={{ "--stagger-i": idx } as React.CSSProperties}
              >
                <div className="rse-step-indicator">
                  {isDone ? (
                    <ChevronRight size={12} aria-hidden="true" />
                  ) : (
                    <StepIcon size={12} aria-hidden="true" />
                  )}
                </div>
                <span className="rse-step-label">{step.label}</span>
                {isActive && !reducedMotion && (
                  <span className="rse-step-pulse" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Presenting State ──────────────────────────────────────────── */}
      {agentState === "presenting" && (
        <div className="rse-presenting">
          {/* ── SVG Node Graph ─────────────────────────────────────────── */}
          <div className="rse-graph-container">
            <svg
              className="rse-graph-svg"
              viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
              role="img"
              aria-label="Grafo de correlación entre dominios"
            >
              {/* Edges */}
              {edges.map((edge, idx) => {
                const fromNode = DOMAIN_NODES.find(
                  (n) => n.source === edge.from,
                );
                const toNode = DOMAIN_NODES.find(
                  (n) => n.source === edge.to,
                );
                if (!fromNode || !toNode) return null;

                const fromPos = getNodePosition(fromNode.angle);
                const toPos = getNodePosition(toNode.angle);
                const midX = (fromPos.x + toPos.x) / 2;
                const midY = (fromPos.y + toPos.y) / 2;

                return (
                  <g key={`edge-${idx}`} className="rse-edge">
                    <line
                      x1={fromPos.x}
                      y1={fromPos.y}
                      x2={toPos.x}
                      y2={toPos.y}
                      className="rse-edge-line"
                      style={
                        {
                          "--edge-weight": edge.weight,
                          "--stagger-i": idx,
                        } as React.CSSProperties
                      }
                      strokeDasharray={
                        reducedMotion ? undefined : "4 6"
                      }
                    />
                    {/* Opportunity blip at edge midpoint */}
                    {edge.opportunityCount > 0 && (
                      <circle
                        cx={midX}
                        cy={midY}
                        r={3 + edge.opportunityCount * 2}
                        className="rse-edge-blip"
                        style={
                          {
                            "--stagger-i": idx + edges.length,
                          } as React.CSSProperties
                        }
                      />
                    )}
                  </g>
                );
              })}

              {/* Domain nodes */}
              {DOMAIN_NODES.map((node, idx) => {
                const pos = getNodePosition(node.angle);
                const config = SIGNAL_SOURCE_CONFIG[node.source];
                const isActive = activeDomains.has(node.source);
                const summary = crossDomainSummaries.find(
                  (s) => s.source === node.source,
                );

                return (
                  <g
                    key={node.source}
                    className="rse-node"
                    data-active={isActive ? "" : undefined}
                    style={
                      {
                        "--stagger-i": idx,
                      } as React.CSSProperties
                    }
                  >
                    {/* Glow circle (active nodes) */}
                    {isActive && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={22}
                        className="rse-node-glow"
                        fill="none"
                        stroke={config.color}
                        strokeWidth="1"
                        opacity="0.3"
                      />
                    )}
                    {/* Node circle */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={16}
                      className="rse-node-circle"
                      fill={isActive ? config.color : "var(--color-surface-2)"}
                      stroke={
                        isActive
                          ? config.color
                          : "var(--color-border-subtle)"
                      }
                      strokeWidth={isActive ? 2 : 1}
                      opacity={isActive ? 1 : 0.4}
                    />
                    {/* Signal count */}
                    {isActive && summary && (
                      <text
                        x={pos.x}
                        y={pos.y + 1}
                        className="rse-node-count"
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {summary.signalCount}
                      </text>
                    )}
                    {/* Label */}
                    <text
                      x={pos.x}
                      y={pos.y + 30}
                      className="rse-node-label"
                      textAnchor="middle"
                    >
                      {config.label}
                    </text>
                  </g>
                );
              })}

              {/* Center health gauge */}
              <circle
                cx={CENTER}
                cy={CENTER}
                r={30}
                className="rse-center-circle"
              />
              <text
                x={CENTER}
                y={CENTER - 6}
                className="rse-center-score"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {health.score}
              </text>
              <text
                x={CENTER}
                y={CENTER + 10}
                className="rse-center-label"
                textAnchor="middle"
                dominantBaseline="central"
              >
                síntesis
              </text>
            </svg>
          </div>

          {/* ── Opportunity Cards ─────────────────────────────────────── */}
          <div className="rse-opportunities">
            <div className="rse-opp-header">
              <span className="rse-opp-title">
                Oportunidades Detectadas ({opportunities.length})
              </span>
              <Button
                variant="unstyled"
                type="button"
                className="rse-retry-btn"
                onClick={handleRetry}
                title="Re-ejecutar síntesis"
              >
                <RefreshCw size={14} aria-hidden="true" />
              </Button>
            </div>

            <div className="rse-opp-list">
              {opportunities.slice(0, isExpanded ? undefined : 3).map(
                (opp, idx) => {
                  const levelConfig = OPPORTUNITY_LEVEL_CONFIG[opp.level];
                  opp.source_domains
                                          .map(
                                            (d) => SIGNAL_SOURCE_CONFIG[d]?.label ?? d,
                                          )
                                          .join(" ↔ ");

                  return (
                    <div
                      key={opp.id}
                      className="rse-opp-card"
                      data-opportunity-level={opp.level}
                      style={
                        {
                          "--stagger-i": idx,
                        } as React.CSSProperties
                      }
                    >
                      <div className="rse-opp-card-header">
                        <span className="rse-opp-score">{opp.score}</span>
                        <span
                          className="rse-opp-level"
                          style={{ color: levelConfig.color }}
                        >
                          {levelConfig.label}
                        </span>
                      </div>
                      <h4 className="rse-opp-card-title">{opp.title}</h4>
                      <p className="rse-opp-card-desc">{opp.description}</p>
                      <div className="rse-opp-card-domains">
                        {opp.source_domains.map((d) => (
                          <span
                            key={d}
                            className="rse-opp-domain-tag"
                            data-signal-source={d}
                          >
                            {SIGNAL_SOURCE_CONFIG[d]?.label ?? d}
                          </span>
                        ))}
                      </div>
                      {opp.window_expires_at && (
                        <div className="rse-opp-card-expiry">
                          Ventana:{" "}
                          {formatExpiryWindow(opp.window_expires_at)}
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>

            {opportunities.length > 3 && (
              <Button
                variant="unstyled"
                type="button"
                className="rse-expand-btn"
                onClick={() => setIsExpanded((prev) => !prev)}
              >
                {isExpanded
                  ? "Colapsar"
                  : `Ver ${opportunities.length - 3} más`}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function formatExpiryWindow(isoDate: string): string {
  const expiry = new Date(isoDate);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  if (diffMs <= 0) return "Expirada";

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `${diffHours}h restantes`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d restantes`;
}