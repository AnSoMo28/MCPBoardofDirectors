// src/shared/components/ai/CausalChainViz.tsx
// Fase 23 — Silver Tide Causal Neural Flow Visualization
// Glass · Neural Flow · Propagation Animation · Per-Node Confidence
// ═══════════════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Link2, AlertTriangle, TrendingDown,
  DollarSign, Users, Settings, Target, Activity, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { cn } from "@/shared/lib/utils";
import type { CausalChain } from "@/shared/lib/advisor-engine/types";
import { getChainShortDescription } from "@/shared/lib/advisor-engine/causal-chain";
import './CausalChainViz.css';

/* ──────────────────────────────────────
   Types & Config
   ────────────────────────────────────── */

interface CausalChainVizProps {
  chains: CausalChain[];
  compact?: boolean;
  className?: string;
  onChainClick?: (chain: CausalChain) => void;
}

const SEVERITY_CONFIG: Record<string, {
  color: string;
  glow: string;
  label: string;
  weight: number;
}> = {
  critical: { color: "var(--color-rose-400)", glow: "rgba(228, 90, 100, 0.12)", label: "Crítico", weight: 4 },
  high:     { color: "var(--color-amber-400)", glow: "rgba(251, 191, 36, 0.10)", label: "Alto", weight: 3 },
  medium:   { color: "var(--color-teal-400)", glow: "rgba(52, 211, 153, 0.08)", label: "Medio", weight: 2 },
  low:      { color: "var(--color-silver-500)", glow: "rgba(255, 255, 255, 0.03)", label: "Bajo", weight: 1 },
};

function deriveSeverity(confidence: number): string {
  if (confidence > 0.7) return "critical";
  if (confidence > 0.5) return "high";
  if (confidence > 0.3) return "medium";
  return "low";
}

function getSeverityConfig(severity: string) {
  return SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.medium;
}

/* ──────────────────────────────────────
   Domain Icon Mapping
   ────────────────────────────────────── */

function getDomainIcon(label: string): LucideIcon {
  const lower = label.toLowerCase();
  if (lower.includes("financ") || lower.includes("revenue") || lower.includes("ingreso")) return DollarSign;
  if (lower.includes("engagement") || lower.includes("retención") || lower.includes("socio") || lower.includes("member")) return Users;
  if (lower.includes("operac") || lower.includes("mantenimiento") || lower.includes("staff")) return Settings;
  if (lower.includes("riesgo") || lower.includes("risk") || lower.includes("alerta")) return AlertTriangle;
  if (lower.includes("evento") || lower.includes("event")) return Activity;
  if (lower.includes("marketing") || lower.includes("comunicación")) return Zap;
  return Target;
}

/* ──────────────────────────────────────
   Confidence Hex — Compact Gauge
   ────────────────────────────────────── */

function ConfidenceHex({
  confidence,
  size = 36,
  reduced,
}: {
  confidence: number;
  size?: number;
  reduced: boolean;
}) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 70 ? "var(--color-rose-400)"
    : pct >= 50 ? "var(--color-amber-400)"
    : "var(--color-teal-400)";

  const r = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;

  const hexPoints = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(" ");
  }, [cx, cy, r]);

  const fillR = r * confidence;
  const fillPoints = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      return `${cx + fillR * Math.cos(angle)},${cy + fillR * Math.sin(angle)}`;
    }).join(" ");
  }, [cx, cy, fillR]);

  return (
    <div className="glass-chain__hex" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="glass-chain__hex-svg">
        <polygon points={hexPoints} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <motion.polygon
          points={fillPoints}
          fill={color}
          fillOpacity="0.1"
          stroke={color}
          strokeWidth="1.2"
          initial={reduced ? undefined : { opacity: 0, scale: 0.5 }}
          animate={reduced ? undefined : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ transformOrigin: `${cx}px ${cy}px`, filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <span className="glass-chain__hex-value" style={{ color, fontSize: size * 0.28 }}>
        {pct}
      </span>
    </div>
  );
}

/* ──────────────────────────────────────
   Neural Flow Diagram
   ────────────────────────────────────── */

function NeuralFlowDiagram({
  chain,
  reduced,
  isMobile,
}: {
  chain: CausalChain;
  reduced: boolean;
  isMobile: boolean;
}) {
  const labels = chain.domainLabels;
  const nodeCount = labels.length;

  /* SVG dimensions */
  const nodeSpacing = isMobile ? 70 : 90;
  const svgWidth = (nodeCount - 1) * nodeSpacing + 60;
  const svgHeight = 56;
  const startX = 30;

  return (
    <div className="glass-chain__flow">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="glass-chain__flow-svg"
        style={{ width: "100%", maxWidth: svgWidth }}
      >
        {/* Connection lines */}
        {labels.map((_, i) => {
          if (i === labels.length - 1) return null;
          const x1 = startX + i * nodeSpacing + 14;
          const x2 = startX + (i + 1) * nodeSpacing - 14;
          const y = svgHeight / 2;

          return (
            <motion.g key={`conn-${i}`}>
              {/* Background line */}
              <line
                x1={x1} y1={y} x2={x2} y2={y}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="2"
              />
              {/* Animated flow line */}
              <motion.line
                x1={x1} y1={y} x2={x2} y2={y}
                stroke="var(--color-gold-400)"
                strokeWidth="2"
                strokeLinecap="round"
                initial={reduced ? undefined : { pathLength: 0, opacity: 0 }}
                animate={reduced ? undefined : { pathLength: 1, opacity: 0.6 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.3, ease: "easeOut" }}
              />
              {/* Flow particle */}
              {!reduced && (
                <motion.circle
                  r="2.5"
                  fill="var(--color-gold-400)"
                  initial={{ cx: x1, opacity: 0 }}
                  animate={{
                    cx: [x1, x2],
                    opacity: [0, 0.8, 0],
                  }}
                  transition={{
                    duration: 1.2,
                    delay: 0.6 + i * 0.3,
                    repeat: Infinity,
                    repeatDelay: 2,
                    ease: "easeInOut",
                  }}
                  cy={y}
                  style={{ filter: "drop-shadow(0 0 3px var(--color-gold-400))" }}
                />
              )}
            </motion.g>
          );
        })}

        {/* Nodes */}
        {labels.map((label, i) => {
          const cx = startX + i * nodeSpacing;
          const cy = svgHeight / 2;
          const isRoot = i === 0;
          const isFinal = i === labels.length - 1;
          const DomainIcon = getDomainIcon(label);

          const nodeColor = isRoot
            ? "var(--color-rose-400)"
            : isFinal
              ? "var(--color-amber-400)"
              : "var(--color-silver-400)";

          return (
            <motion.g
              key={`node-${i}`}
              initial={reduced ? undefined : { opacity: 0, scale: 0.6 }}
              animate={reduced ? undefined : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.15 + i * 0.3 }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            >
              {/* Node glow */}
              {(isRoot || isFinal) && (
                <circle
                  cx={cx} cy={cy} r="14"
                  fill={nodeColor}
                  opacity="0.06"
                  style={{ filter: "blur(4px)" }}
                />
              )}
              {/* Node circle */}
              <circle
                cx={cx} cy={cy} r="11"
                fill="rgba(14, 20, 32, 0.8)"
                stroke={nodeColor}
                strokeWidth={isRoot || isFinal ? "2" : "1.2"}
                style={isRoot || isFinal ? { filter: `drop-shadow(0 0 4px ${nodeColor})` } : undefined}
              />
              {/* Icon (rendered as foreignObject) */}
              <foreignObject x={cx - 7} y={cy - 7} width="14" height="14">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                  <DomainIcon size={10} style={{ color: nodeColor }} />
                </div>
              </foreignObject>
            </motion.g>
          );
        })}
      </svg>

      {/* Labels below nodes */}
      <div className="glass-chain__flow-labels" style={{ paddingLeft: 12 }}>
        {labels.map((label, i) => {
          const isRoot = i === 0;
          const isFinal = i === labels.length - 1;
          return (
            <motion.div
              key={i}
              className="glass-chain__flow-label"
              style={{ width: nodeSpacing }}
              initial={reduced ? undefined : { opacity: 0, y: 4 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.3 }}
            >
              <span
                className={cn(
                  "glass-chain__flow-label-tag",
                  isRoot && "glass-chain__flow-label-tag--root",
                  isFinal && "glass-chain__flow-label-tag--final",
                )}
              >
                {isRoot && <TrendingDown className="w-2.5 h-2.5" />}
                {label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Compact Chain — Neural Badge
   ────────────────────────────────────── */

function CompactChain({
  chain,
  reduced,
}: {
  chain: CausalChain;
  reduced: boolean;
}) {
  const severity = deriveSeverity(chain.compoundConfidence);
  const sev = getSeverityConfig(severity);
  const pct = Math.round(chain.compoundConfidence * 100);

  /* Mini flow dots */
  const dotCount = Math.min(chain.chainLength, 5);

  return (
    <motion.div
      className="glass-chain__compact"
      style={{ borderColor: sev.color }}
      whileHover={reduced ? undefined : { scale: 1.01, y: -1 }}
      transition={{ duration: 0.15 }}
    >
      <Link2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: sev.color }} />
      <span className="glass-chain__compact-text">{getChainShortDescription(chain)}</span>

      {/* Mini flow indicator */}
      <span className="glass-chain__compact-flow">
        {Array.from({ length: dotCount }, (_, i) => (
          <span key={i} className="glass-chain__compact-flow-dot" style={{ background: sev.color, opacity: 0.3 + (i / dotCount) * 0.7 }}>
            {i < dotCount - 1 && <span className="glass-chain__compact-flow-line" style={{ background: sev.color }} />}
          </span>
        ))}
      </span>

      {/* Mini confidence gauge */}
      <div className="glass-chain__compact-conf">
        <svg viewBox="0 0 24 24" className="glass-chain__compact-ring">
          <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2.5" />
          <motion.circle
            cx="12" cy="12" r="9"
            fill="none"
            stroke={sev.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${chain.compoundConfidence * 56.5} 56.5`}
            transform="rotate(-90 12 12)"
            initial={reduced ? undefined : { strokeDasharray: "0 56.5" }}
            animate={reduced ? undefined : { strokeDasharray: `${chain.compoundConfidence * 56.5} 56.5` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </svg>
        <span className="glass-chain__compact-pct" style={{ color: sev.color }}>{pct}%</span>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Expanded Chain — Full Intelligence Card
   ────────────────────────────────────── */

function ExpandedChain({
  chain,
  index,
  reduced,
  isMobile,
  onChainClick,
}: {
  chain: CausalChain;
  index: number;
  reduced: boolean;
  isMobile: boolean;
  onChainClick?: (chain: CausalChain) => void;
}) {
  const severity = deriveSeverity(chain.compoundConfidence);
  const sev = getSeverityConfig(severity);
  const isCritical = severity === "critical";

  return (
    <motion.div
      className={cn(
        "glass-chain__expanded",
        isCritical && "glass-chain__expanded--critical",
      )}
      style={{ borderLeftColor: sev.color }}
      initial={reduced ? undefined : { opacity: 0, y: 10 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      onClick={() => onChainClick?.(chain)}
      role={onChainClick ? "button" : undefined}
      tabIndex={onChainClick ? 0 : undefined}
      onKeyDown={onChainClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChainClick(chain);
        }
      } : undefined}
    >
      {/* Header */}
      <div className="glass-chain__expanded-header">
        <div className="glass-chain__expanded-header-left">
          <Link2 className="w-4 h-4" style={{ color: sev.color }} />
          <span className="glass-chain__expanded-title">Cadena causal #{index + 1}</span>
          <span className="glass-chain__expanded-severity" style={{ color: sev.color }}>
            {sev.label}
          </span>
        </div>
        <div className="glass-chain__expanded-header-right">
          <span className="glass-chain__expanded-meta">
            {chain.chainLength} dominios
          </span>
          <ConfidenceHex confidence={chain.compoundConfidence} size={36} reduced={reduced} />
        </div>
      </div>

      {/* Neural Flow Diagram */}
      <NeuralFlowDiagram chain={chain} reduced={reduced} isMobile={isMobile} />

      {/* Description — typewriter feel */}
      <motion.p
        className="glass-chain__expanded-desc"
        initial={reduced ? undefined : { opacity: 0 }}
        animate={reduced ? undefined : { opacity: 1 }}
        transition={{ delay: 0.3 + index * 0.1 + chain.chainLength * 0.3 }}
      >
        {chain.description}
      </motion.p>

      {/* Critical alert pulse */}
      {isCritical && (
        <div className="glass-chain__expanded-critical-badge">
          <AlertTriangle className="w-3 h-3" />
          <span>Requiere atención inmediata</span>
        </div>
      )}
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Main Orchestrator
   ────────────────────────────────────── */

export function CausalChainViz({
  chains,
  compact = false,
  className,
  onChainClick,
}: CausalChainVizProps) {
  const prefersReduced = useReducedMotion();
  const { isMobile } = useBreakpoint();

  const sortedChains = useMemo(() => {
    return [...chains].sort((a, b) => {
      const sa = deriveSeverity(a.compoundConfidence);
      const sb = deriveSeverity(b.compoundConfidence);
      return (SEVERITY_CONFIG[sb]?.weight ?? 0) - (SEVERITY_CONFIG[sa]?.weight ?? 0);
    });
  }, [chains]);

  if (!chains.length) return null;

  const highestSeverity = deriveSeverity(sortedChains[0].compoundConfidence);
  const topSev = getSeverityConfig(highestSeverity);

  /* ── Compact ── */
  if (compact) {
    return (
      <div className={cn("glass-chain glass-chain--compact-wrap", className)}>
        {sortedChains.map((chain) => (
          <CompactChain key={chain.id} chain={chain} reduced={prefersReduced} />
        ))}
      </div>
    );
  }

  /* ── Expanded ── */
  return (
    <div
      className={cn("glass-chain glass-chain--expanded-wrap", className)}
      style={{ borderTopColor: topSev.color }}
    >
      {/* Ambient glow */}
      <span className="glass-chain__glow" style={{ background: topSev.glow }} />

      {/* Multi-chain header */}
      {sortedChains.length > 1 && (
        <motion.div
          className="glass-chain__multi-header"
          initial={prefersReduced ? undefined : { opacity: 0 }}
          animate={prefersReduced ? undefined : { opacity: 1 }}
        >
          <AlertTriangle className="w-4 h-4" style={{ color: topSev.color }} />
          <span>{sortedChains.length} cadenas causales activas</span>
          <span className="glass-chain__multi-highest" style={{ color: topSev.color }}>
            Severidad más alta: {topSev.label}
          </span>
        </motion.div>
      )}

      {/* Chain cards */}
      <div className="glass-chain__list">
        {sortedChains.map((chain, i) => (
          <ExpandedChain
            key={chain.id}
            chain={chain}
            index={i}
            reduced={prefersReduced}
            isMobile={isMobile}
            onChainClick={onChainClick}
          />
        ))}
      </div>
    </div>
  );
}