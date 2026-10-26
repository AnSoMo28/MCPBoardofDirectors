// src/shared/components/ml/ModelHealthPanel.tsx
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Model Health Panel
// Neural Fleet Diagnostic Console — Fase 23 (capstone)
//
// Fleet constellation, anomaly heat strip, trend sparklines,
// PSI instrument, accuracy ring, ambient hue, severity cascade.
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Gauge,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { useModelHealthPanel } from "./hooks/useModelHealthPanel";
import { cn } from "@/shared/lib/utils";
import type { ModelPerformance, DriftReport } from "@/shared/mocks/contracts";
import '../../ml/ml-glass.css';
import './ModelHealthPanel.css';

// ═══════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════

const DRIFT_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof Activity }
> = {
  stable: { label: "Estable", color: "var(--color-emerald-400)", icon: CheckCircle },
  mild: { label: "Leve", color: "var(--color-amber-400)", icon: TrendingUp },
  significant: { label: "Significativo", color: "var(--color-rose-400)", icon: TrendingDown },
  severe: { label: "Severo", color: "var(--color-rose-400)", icon: AlertTriangle },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; badgeClass: string; cardClass: string }
> = {
  healthy: {
    label: "Saludable",
    color: "var(--color-emerald-400)",
    badgeClass: "glass-mhp__badge--healthy",
    cardClass: "",
  },
  degraded: {
    label: "Degradado",
    color: "var(--color-amber-400)",
    badgeClass: "glass-mhp__badge--degraded",
    cardClass: "glass-mhp__card--drift",
  },
  retrain_needed: {
    label: "Retrain",
    color: "var(--color-rose-400)",
    badgeClass: "glass-mhp__badge--retrain",
    cardClass: "glass-mhp__card--retrain",
  },
};

const TYPE_ICONS: Record<string, typeof Brain> = {
  anomaly_detection: AlertTriangle,
  forecasting: TrendingUp,
  churn: TrendingDown,
  clustering: Activity,
};

const EASE = [0.16, 1, 0.3, 1] as any;

const BOOT_MSGS = [
  "Cargando fleet diagnostic console…",
  "Analizando modelos ML…",
  "Evaluando drift y precisión…",
  "Compilando reporte de salud…",
];

// ═══════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════

/* Accuracy Ring */
function AccuracyRing({
  accuracy,
  reduced,
  size = 68,
}: {
  accuracy: number;
  reduced: boolean;
  size?: number;
}) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - accuracy / 100);
  const color =
    accuracy >= 85
      ? "var(--color-emerald-400)"
      : accuracy >= 70
        ? "var(--color-amber-400)"
        : "var(--color-rose-400)";

  return (
    <div className="glass-mhp__ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="5"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={reduced ? undefined : { strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={
            reduced
              ? undefined
              : { duration: 0.8, ease: EASE, delay: 0.2 }
          }
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <div className="glass-mhp__ring-center">
        <span className="glass-mhp__ring-value" style={{ color }}>
          {accuracy > 0 ? `${accuracy.toFixed(0)}%` : "—"}
        </span>
      </div>
    </div>
  );
}

/* PSI Instrument */
function PSIInstrument({
  score,
  threshold,
  reduced,
}: {
  score: number;
  threshold: number;
  reduced: boolean;
}) {
  const pct = Math.min((score / 0.5) * 100, 100);
  const threshPct = (threshold / 0.5) * 100;
  const color =
    score < 0.1
      ? "var(--color-emerald-400)"
      : score < 0.2
        ? "var(--color-amber-400)"
        : "var(--color-rose-400)";

  return (
    <div className="glass-mhp__psi">
      <div className="glass-mhp__psi-header">
        <span className="glass-mhp__psi-label">PSI</span>
        <span className="glass-mhp__psi-value" style={{ color }}>
          {score.toFixed(3)}
        </span>
      </div>
      <div className="glass-mhp__psi-track">
        <div
          className="glass-mhp__psi-zone glass-mhp__psi-zone--green"
          style={{ width: "20%" }}
        />
        <div
          className="glass-mhp__psi-zone glass-mhp__psi-zone--amber"
          style={{ left: "20%", width: "20%" }}
        />
        <div
          className="glass-mhp__psi-zone glass-mhp__psi-zone--red"
          style={{ left: "40%", width: "60%" }}
        />
        <motion.div
          className="glass-mhp__psi-fill"
          style={{ background: color }}
          initial={reduced ? undefined : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={
            reduced ? undefined : { duration: 0.6, delay: 0.3, ease: "easeOut" }
          }
        />
        <div
          className="glass-mhp__psi-threshold"
          style={{ left: `${threshPct}%` }}
          title={`Threshold: ${threshold}`}
        />
      </div>
      <div className="glass-mhp__psi-scale">
        <span>0</span>
        <span>0.50</span>
      </div>
    </div>
  );
}

/* Trend Sparkline */
function Sparkline({
  accuracy,
  driftMagnitude,
  reduced,
}: {
  accuracy: number;
  driftMagnitude: number;
  reduced: boolean;
}) {
  /* Synthetic trend from accuracy + drift */
  const points = useMemo(() => {
    const base = accuracy;
    const pts: number[] = [];
    for (let i = 0; i < 8; i++) {
      const noise = (Math.sin(i * 2.3) * driftMagnitude * 50);
      pts.push(Math.max(0, Math.min(100, base + noise - (driftMagnitude > 0.05 ? i * 2 : 0))));
    }
    return pts;
  }, [accuracy, driftMagnitude]);

  const w = 80;
  const h = 24;
  const stepX = w / (points.length - 1);
  const minV = Math.min(...points);
  const maxV = Math.max(...points);
  const range = maxV - minV || 1;

  const pathD = points
    .map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - minV) / range) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const color =
    accuracy >= 85
      ? "var(--color-emerald-400)"
      : accuracy >= 70
        ? "var(--color-amber-400)"
        : "var(--color-rose-400)";

  return (
    <div className="glass-mhp__sparkline">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <motion.path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduced ? undefined : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={
            reduced
              ? undefined
              : { duration: 1, ease: EASE, delay: 0.4 }
          }
          opacity={0.7}
        />
      </svg>
    </div>
  );
}

/* Fleet Constellation */
function FleetConstellation({
  models,
  focusedModel,
  onFocus,
  reduced,
}: {
  models: ModelPerformance[];
  focusedModel: string | null;
  onFocus: (name: string | null) => void;
  reduced: boolean;
}) {
  const w = 320;
  const h = 80;
  const padX = 40;
  const cy = h / 2;
  const stepX = models.length > 1 ? (w - padX * 2) / (models.length - 1) : 0;

  return (
    <div className="glass-mhp__constellation">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-3.5 h-3.5 text-[var(--color-teal-400)]" />
        <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] uppercase tracking-wider">
          Mapa de la flota
        </span>
      </div>
      <svg
        width="100%"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="overflow-visible"
      >
        {/* Connection lines */}
        {models.map((_m, i) => {
          if (i === models.length - 1) return null;
          const x1 = padX + i * stepX;
          const x2 = padX + (i + 1) * stepX;
          return (
            <line
              key={`line-${i}`}
              x1={x1}
              y1={cy}
              x2={x2}
              y2={cy}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
          );
        })}

        {/* Nodes */}
        {models.map((m, i) => {
          const x = padX + i * stepX;
          const statusCfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.healthy;
          const isFocused = focusedModel === m.model_name;
          const nodeR = isFocused ? 18 : 14;

          return (
            <motion.g
              key={m.model_name}
              className="glass-mhp__constellation-node"
              onClick={() =>
                onFocus(isFocused ? null : m.model_name)
              }
              initial={reduced ? undefined : { opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.3,
                delay: 0.1 + i * 0.08,
                ease: EASE,
              }}
            >
              {/* Glow */}
              {isFocused && (
                <circle
                  cx={x}
                  cy={cy}
                  r={nodeR + 4}
                  fill="none"
                  stroke={statusCfg.color}
                  strokeWidth={1}
                  opacity={0.3}
                />
              )}
              {/* Node */}
              <circle
                cx={x}
                cy={cy}
                r={nodeR}
                fill="rgba(14,20,32,0.9)"
                stroke={statusCfg.color}
                strokeWidth={isFocused ? 2 : 1.5}
              />
              {/* Label */}
              <foreignObject
                x={x - nodeR}
                y={cy - nodeR}
                width={nodeR * 2}
                height={nodeR * 2}
                className="overflow-visible"
              >
                <div className="flex items-center justify-center w-full h-full">
                  <span
                    className="text-[7px] font-[family-name:var(--font-mono)] font-semibold text-center leading-tight"
                    style={{ color: statusCfg.color }}
                  >
                    {m.model_name.slice(0, 4)}
                  </span>
                </div>
              </foreignObject>
              {/* Accuracy below */}
              <text
                x={x}
                y={cy + nodeR + 12}
                textAnchor="middle"
                fontSize="8"
                fontFamily="var(--font-mono)"
                fill="var(--color-silver-500)"
              >
                {m.accuracy.toFixed(0)}%
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}

/* Anomaly Heat Strip */
function AnomalyHeatStrip({
  models,
  reduced,
}: {
  models: ModelPerformance[];
  reduced: boolean;
}) {
  return (
    <motion.div
      className="glass-mhp__heat-strip"
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15, ease: EASE }}
    >
      {models.map((m, i) => {
        const severity =
          m.status === "retrain_needed"
            ? 1
            : m.status === "degraded"
              ? 0.6
              : m.drift_detected
                ? 0.4
                : 0.15;
        const color =
          severity >= 0.8
            ? "var(--color-rose-400)"
            : severity >= 0.5
              ? "var(--color-amber-400)"
              : "var(--color-emerald-400)";

        return (
          <motion.div
            key={m.model_name}
            className="glass-mhp__heat-cell"
            style={{ backgroundColor: color, opacity: 0.3 + severity * 0.5 }}
            title={`${m.display_name}: ${m.status}`}
            initial={reduced ? undefined : { scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{
              duration: 0.3,
              delay: 0.2 + i * 0.06,
              ease: EASE,
            }}
          />
        );
      })}
    </motion.div>
  );
}

/* Model Card */
function ModelCard({
  model,
  driftReport,
  reduced,
  index,
}: {
  model: ModelPerformance;
  driftReport: DriftReport | undefined;
  reduced: boolean;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[model.status] ?? STATUS_CONFIG.healthy;
  const TypeIcon = TYPE_ICONS[model.model_type] ?? Brain;

  return (
    <motion.div
      className={cn("glass-mhp__card", statusCfg.cardClass)}
      initial={reduced ? undefined : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.3 + index * 0.06, ease: EASE }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.03]">
            <TypeIcon size={16} style={{ color: statusCfg.color }} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] truncate">
              {model.display_name}
            </h3>
            <span className="text-[9px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
              {model.model_type}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Sparkline
            accuracy={model.accuracy}
            driftMagnitude={model.drift_magnitude ?? 0}
            reduced={reduced}
          />
          <span className={cn("glass-mhp__badge", statusCfg.badgeClass)}>
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* Vitals: Ring + PSI */}
      <div className="flex items-center gap-4">
        <AccuracyRing accuracy={model.accuracy} reduced={reduced} />

        <div className="flex-1 min-w-0 space-y-2">
          {model.psi_score != null ? (
            <PSIInstrument
              score={model.psi_score}
              threshold={model.retrain_threshold}
              reduced={reduced}
            />
          ) : (
            <div className="flex items-center gap-2">
              <Gauge size={14} className="text-[var(--color-silver-500)]" />
              <span className="text-[11px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                PSI no disponible
              </span>
            </div>
          )}
          {model.mape > 0 && (
            <span className="text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-mono)]">
              MAPE: {model.mape.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="glass-mhp__meta">
        <div className="glass-mhp__meta-item">
          <Clock size={12} />
          <span>
            {model.last_trained
              ? new Date(model.last_trained).toLocaleDateString("es-CR")
              : "N/A"}
          </span>
        </div>
        <div className="glass-mhp__meta-item">
          <Activity size={12} />
          <span>{model.training_samples.toLocaleString("es-CR")} muestras</span>
        </div>
        {model.drift_detected && (
          <div className="glass-mhp__meta-item glass-mhp__meta-item--drift">
            <AlertTriangle size={12} />
            <span>Drift: {model.drift_magnitude.toFixed(3)}</span>
          </div>
        )}
      </div>

      {/* Retrain alert */}
      {driftReport?.retrain_recommended && (
        <div className="glass-mhp__retrain">
          <RefreshCw size={14} />
          <span>
            Retrain recomendado — PSI: {driftReport.psi_score.toFixed(3)}
          </span>
        </div>
      )}

      {/* Feature Importance */}
      {model.feature_importance.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="glass-mhp__features-toggle"
          >
            <span>Feature Importance</span>
            {expanded ? (
              <ChevronUp size={12} />
            ) : (
              <ChevronDown size={12} />
            )}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={reduced ? undefined : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={
                  reduced
                    ? undefined
                    : { opacity: 0, height: 0 }
                }
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-1 pt-1">
                  {model.feature_importance.map((f, i) => (
                    <motion.div
                      key={f.feature}
                      className="glass-mhp__feature"
                      initial={reduced ? undefined : { opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={
                        reduced ? undefined : { delay: i * 0.03 }
                      }
                    >
                      <span className="glass-mhp__feature-name">
                        {f.feature}
                      </span>
                      <span className="glass-mhp__feature-pct">
                        {f.importance_pct}%
                      </span>
                      <div className="glass-mhp__feature-track">
                        <motion.div
                          className="glass-mhp__feature-fill"
                          initial={
                            reduced ? undefined : { width: 0 }
                          }
                          animate={
                            reduced
                              ? undefined
                              : { width: `${f.importance_pct}%` }
                          }
                          transition={
                            reduced
                              ? undefined
                              : { duration: 0.4, delay: i * 0.03 }
                          }
                          style={{
                            opacity: 0.7 + (f.importance_pct / 100) * 0.3,
                          }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

/* Boot Sequence Loader */
function BootSequence({ reduced }: { reduced: boolean }) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const interval = setInterval(
      () => setMsgIdx((p) => (p + 1) % BOOT_MSGS.length),
      1200,
    );
    return () => clearInterval(interval);
  }, [reduced]);

  return (
    <div className="glass-mhp__boot">
      <div className="glass-mhp__boot-icon">
        <Brain size={28} className="text-[var(--color-teal-400)]" />
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={msgIdx}
          className="glass-mhp__boot-msg"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
        >
          {BOOT_MSGS[msgIdx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/* Skeleton */
function MHPSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="glass-mhp__card opacity-60"
          style={{ minHeight: 160 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04]" />
            <div className="space-y-1.5">
              <div className="w-32 h-3 rounded bg-white/[0.04]" />
              <div className="w-20 h-2 rounded bg-white/[0.03]" />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-[68px] h-[68px] rounded-full bg-white/[0.03]" />
            <div className="flex-1 space-y-2">
              <div className="w-full h-2 rounded bg-white/[0.03]" />
              <div className="w-2/3 h-2 rounded bg-white/[0.03]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════

export function ModelHealthPanel() {
  const reduced = useReducedMotion();
  const { isMobile } = useBreakpoint();
  const {
    shouldFetch,
    handleLoad,
    query,
    report,
    driftMap,
    fleetHealth,
    ambientHue,
  } = useModelHealthPanel();

  const [focusedModel, setFocusedModel] = useState<string | null>(null);

  const { isLoading, isError, refetch } = query;

  /* Severity-sorted models */
  const sortedModels = useMemo(() => {
    if (!report?.models) return [];
    const order: Record<string, number> = {
      retrain_needed: 0,
      degraded: 1,
      healthy: 2,
    };
    return [...report.models].sort(
      (a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9),
    );
  }, [report?.models]);

  /* Filtered models (when focused) */
  const visibleModels = useMemo(() => {
    if (!focusedModel) return sortedModels;
    return sortedModels.filter((m) => m.model_name === focusedModel);
  }, [sortedModels, focusedModel]);

  /* Ambient glow color */
  const ambientColor = useMemo(() => {
    if (ambientHue == null) return "radial-gradient(circle, rgba(94, 234, 212, 0.04), transparent 70%)";
    return `radial-gradient(circle, hsl(${ambientHue} 70% 55% / 0.04) 0%, transparent 70%)`;
  }, [ambientHue]);

  /* ── CTA ── */
  if (!shouldFetch) {
    return (
      <div className="glass-mhp">
        <div className="glass-mhp__cta">
          <div className="glass-mhp__cta-icon">
            <Gauge size={24} />
          </div>
          <div className="glass-mhp__cta-text">
            <h3>Salud de Modelos ML</h3>
            <p>
              Precisión, drift (PSI), feature importance y estado de los 5
              modelos de inteligencia.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={handleLoad}
            className="min-h-[44px]"
          >
            <Zap size={16} className="mr-2" />
            Analizar Modelos
          </Button>
        </div>
      </div>
    );
  }

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="glass-mhp">
        {reduced ? (
          <MHPSkeleton />
        ) : (
          <BootSequence reduced={!!reduced} />
        )}
      </div>
    );
  }

  /* ── Error ── */
  if (isError) {
    return (
      <div className="glass-mhp">
        <div className="glass-mhp__error">
          <AlertTriangle
            size={32}
            className="text-[var(--color-rose-400)] mx-auto"
          />
          <p className="text-sm text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
            Error cargando salud de modelos
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  /* ── Empty ── */
  if (!report || report.total_models === 0) {
    return (
      <div className="glass-mhp">
        <div className="glass-mhp__empty">
          <Brain
            className="glass-mhp__empty-icon w-12 h-12 text-[var(--color-silver-500)]"
            strokeWidth={1}
          />
          <p className="text-sm text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
            No hay modelos registrados.
          </p>
        </div>
      </div>
    );
  }

  const driftCfg =
    DRIFT_CONFIG[report.overall_drift_status] ?? DRIFT_CONFIG.stable;

  const sectionAnim = (delay: number) =>
    reduced
      ? undefined
      : ({
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.35, delay, ease: EASE },
        } as const);

  return (
    <div className="glass-mhp">
      {/* Ambient glow */}
      <span
        className="glass-mhp__glow"
        style={{ background: ambientColor }}
        aria-hidden="true"
      />

      <div className="relative z-10 space-y-4">
        {/* ═══ Summary Bar ═══ */}
        <motion.div
          className="glass-mhp__summary"
          {...(sectionAnim(0) ?? {})}
        >
          <div className="glass-mhp__fleet-ring">
            <AccuracyRing
              accuracy={fleetHealth}
              reduced={!!reduced}
              size={60}
            />
            <span className="glass-mhp__fleet-ring-label">Fleet</span>
          </div>

          <div className="flex items-center gap-5 flex-1 justify-center flex-wrap">
            {(
              [
                {
                  label: "Modelos",
                  value: report.total_models,
                  color: "var(--color-silver-100)",
                },
                {
                  label: "Saludables",
                  value: report.healthy_count,
                  color: "var(--color-emerald-400)",
                },
                {
                  label: "Degradados",
                  value: report.degraded_count,
                  color: "var(--color-amber-400)",
                },
                {
                  label: "Retrain",
                  value: report.retrain_needed_count,
                  color: "var(--color-rose-400)",
                },
              ] as const
            ).map((s, i) => (
              <div key={s.label} className="glass-mhp__stat">
                <motion.span
                  className="glass-mhp__stat-value"
                  style={{ color: s.color }}
                  initial={reduced ? undefined : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.3,
                    delay: 0.1 + i * 0.05,
                    ease: EASE,
                  }}
                >
                  {s.value}
                </motion.span>
                <span className="glass-mhp__stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="glass-mhp__drift">
            <driftCfg.icon size={16} style={{ color: driftCfg.color }} />
            <span
              className="glass-mhp__drift-label"
              style={{ color: driftCfg.color }}
            >
              {driftCfg.label}
            </span>
            <span className="glass-mhp__drift-sub">Drift Global</span>
          </div>
        </motion.div>

        {/* ═══ Fleet Constellation ═══ */}
        <motion.div {...(sectionAnim(0.1) ?? {})}>
          <FleetConstellation
            models={sortedModels}
            focusedModel={focusedModel}
            onFocus={setFocusedModel}
            reduced={!!reduced}
          />
        </motion.div>

        {/* ═══ Anomaly Heat Strip ═══ */}
        <AnomalyHeatStrip models={sortedModels} reduced={!!reduced} />

        {/* ═══ Model Cards ═══ */}
        <div
          className={cn(
            "grid gap-3",
            focusedModel
              ? "grid-cols-1"
              : isMobile
                ? "grid-cols-1"
                : "grid-cols-2",
          )}
        >
          {visibleModels.map((model, i) => (
            <ModelCard
              key={model.model_name}
              model={model}
              driftReport={driftMap.get(model.model_name)}
              reduced={!!reduced}
              index={i}
            />
          ))}
        </div>

        {/* ═══ Footer ═══ */}
        {report.next_evaluation && (
          <motion.div
            className="glass-mhp__footer"
            {...(sectionAnim(0.6) ?? {})}
          >
            <Clock size={12} />
            <span>
              Próxima evaluación:{" "}
              {new Date(report.next_evaluation).toLocaleDateString("es-CR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}