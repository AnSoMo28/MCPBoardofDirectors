// src/features/facilities/components/FacilityIntelligenceStream.tsx
// ═══════════════════════════════════════════════════════════════
// FACILITY INTELLIGENCE STREAM — "El Centro de Mando" (REWRITE)
//
// Intelligence Layer additions (I4):
//   1. Action execution lifecycle: idle → executing → success/error
//   2. HITL confirmation modal for critical actions
//   3. Action result feedback (toast-style)
//   4. Action history (last 3 executed)
//
// Living Component Protocol 7/7.
// ═══════════════════════════════════════════════════════════════

import { useMemo, useState, useCallback, useRef, useEffect } from "react";

import {
  AlertTriangle,
  AlertCircle,
  Info,
  Lightbulb,
  ChevronRight,
  ChevronDown,
  Zap,
  HeartPulse,
  Users,
  Compass,
  Activity,
  Sparkles,
  CheckCircle,
  Loader2,
  Check,
  XCircle,
  Clock,
  Shield,
} from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { sortInsightsByPriority } from "@/shared/types/ai-intelligence";

import type {
  FacilitiesAdvisorInsight,
  FacilitiesAdvisorLayer,
  CrossDomainSignal,
  FacilitiesDashboardMode,
  AdvisorCommand,
} from "../types";

import { FACILITIES_ADVISOR_LAYER_META } from "../lib/advisor/types";

import "./FacilityIntelligenceStream.css";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_VISIBLE = 8;
const FEEDBACK_AUTO_DISMISS_MS = 4000;
const MAX_HISTORY = 3;

const LAYER_ORDER: readonly FacilitiesAdvisorLayer[] = [
  "health",
  "engagement",
  "strategy",
  "prediction",
  "innovation",
];

const SEVERITY_ICON: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
  opportunity: Lightbulb,
};

const LAYER_ICONS: Record<
  FacilitiesAdvisorLayer,
  React.ComponentType<{ className?: string }>
> = {
  health: HeartPulse,
  engagement: Users,
  strategy: Compass,
  prediction: Activity,
  innovation: Sparkles,
};

// ═══════════════════════════════════════════════════════════════
// TYPES — Action lifecycle
// ═══════════════════════════════════════════════════════════════

type ActionState = "idle" | "executing" | "success" | "error";

interface ActionResult {
  insightId: string;
  commandLabel: string;
  state: "success" | "error";
  message: string;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function severityToUrgency(severity: string): "high" | "medium" | "low" {
  if (severity === "critical") return "high";
  if (severity === "warning" || severity === "opportunity") return "medium";
  return "low";
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Hace un momento";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `Hace ${hours}h`;
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENT: HITL Confirmation Modal
// ═══════════════════════════════════════════════════════════════

function HitlConfirmModal({
  command,
  insightTitle,
  onConfirm,
  onCancel,
  ambientMode,
}: {
  command: AdvisorCommand;
  insightTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  ambientMode: FacilitiesDashboardMode;
}) {
  return (
    <div
      className="glass-fac-stream__hitl-overlay"
      data-mode={ambientMode}
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar acción"
    >
      <div className="glass-fac-stream__hitl-backdrop" onClick={onCancel} />
      <div className="glass-fac-stream__hitl-dialog">
        <div className="glass-fac-stream__hitl-header">
          <Shield className="glass-fac-stream__hitl-shield-icon" />
          <span className="glass-fac-stream__hitl-title">
            Confirmar acción
          </span>
        </div>

        <p className="glass-fac-stream__hitl-insight">{insightTitle}</p>

        {command.confirm_message && (
          <p className="glass-fac-stream__hitl-message">
            {command.confirm_message}
          </p>
        )}

        {command.risk_summary && (
          <div className="glass-fac-stream__hitl-risk">
            <AlertTriangle className="glass-fac-stream__hitl-risk-icon" />
            <span>{command.risk_summary}</span>
          </div>
        )}

        {command.estimated_impact && (
          <p className="glass-fac-stream__hitl-impact">
            Impacto estimado: {command.estimated_impact}
          </p>
        )}

        <div className="glass-fac-stream__hitl-actions">
          <button
            type="button"
            className="glass-fac-stream__hitl-btn glass-fac-stream__hitl-btn--cancel"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="glass-fac-stream__hitl-btn glass-fac-stream__hitl-btn--confirm"
            onClick={onConfirm}
          >
            {command.label}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENT: Action Feedback Toast
// ═══════════════════════════════════════════════════════════════

function ActionFeedback({
  result,
  onDismiss,
}: {
  result: ActionResult;
  onDismiss: () => void;
}) {
  return (
    <div
      className="glass-fac-stream__feedback"
      data-state={result.state}
      role="status"
    >
      {result.state === "success" ? (
        <Check className="glass-fac-stream__feedback-icon" />
      ) : (
        <XCircle className="glass-fac-stream__feedback-icon" />
      )}
      <span className="glass-fac-stream__feedback-text">
        {result.message}
      </span>
      <button
        type="button"
        className="glass-fac-stream__feedback-dismiss"
        onClick={onDismiss}
        aria-label="Cerrar"
      >
        <XCircle className="w-3 h-3" />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENT: Action History
// ═══════════════════════════════════════════════════════════════

function ActionHistory({ history }: { history: ActionResult[] }) {
  if (history.length === 0) return null;

  return (
    <div className="glass-fac-stream__history">
      <div className="glass-fac-stream__history-head">
        <Clock className="glass-fac-stream__history-icon" />
        <span className="glass-fac-stream__history-title">
          Acciones recientes
        </span>
      </div>
      <div className="glass-fac-stream__history-list">
        {history.map((item, i) => (
          <div
            key={`${item.insightId}-${item.timestamp}`}
            className="glass-fac-stream__history-item"
            data-state={item.state}
            style={{ "--stagger-i": i } as React.CSSProperties}
          >
            {item.state === "success" ? (
              <Check className="glass-fac-stream__history-item-icon" />
            ) : (
              <XCircle className="glass-fac-stream__history-item-icon" />
            )}
            <span className="glass-fac-stream__history-item-label">
              {item.commandLabel}
            </span>
            <span className="glass-fac-stream__history-item-time">
              {formatTimeAgo(item.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENT: SignalCard
// ═══════════════════════════════════════════════════════════════

function SignalCard({
  signal,
  index,
  rm,
}: {
  signal: CrossDomainSignal;
  index: number;
  rm: boolean;
}) {
  return (
    <div
      className="glass-fac-stream__signal"
      data-severity={signal.severity}
      style={
        rm
          ? undefined
          : ({ "--stagger-i": index } as React.CSSProperties)
      }
    >
      <div className="glass-fac-stream__signal-head">
        <Zap className="glass-fac-stream__signal-icon" />
        <span className="glass-fac-stream__signal-domain">
          {signal.domain} → Facilities
        </span>
      </div>
      <p className="glass-fac-stream__signal-text">{signal.signal}</p>
      <span className="glass-fac-stream__signal-meta">
        {signal.severity === "high"
          ? "● Alto"
          : signal.severity === "medium"
            ? "● Medio"
            : "● Bajo"}
        {" · "}
        {Math.round(signal.confidence * 100)}% confianza
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENT: InsightCard
// ═══════════════════════════════════════════════════════════════

function InsightCard({
  insight,
  index,
  expanded,
  actionState,
  onToggle,
  onAction,
  rm,
}: {
  insight: FacilitiesAdvisorInsight;
  index: number;
  expanded: boolean;
  actionState: ActionState;
  onToggle: () => void;
  onAction: (cmd: AdvisorCommand) => void;
  rm: boolean;
}) {
  const Icon = SEVERITY_ICON[insight.severity] ?? Info;
  const LayerIcon = LAYER_ICONS[insight.layer];
  const urgency = severityToUrgency(insight.severity);

  const cmd: AdvisorCommand | undefined =
    insight.action ?? insight.command;

  return (
    <article
      className="glass-fac-stream__card"
      data-urgency={urgency}
      data-layer={insight.layer}
      data-action-state={actionState !== "idle" ? actionState : undefined}
      style={
        rm
          ? undefined
          : ({ "--stagger-i": index } as React.CSSProperties)
      }
    >
      <div className="glass-fac-stream__card-urgency-line" />

      <button
        type="button"
        className="glass-fac-stream__card-head"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <Icon className="glass-fac-stream__card-icon" />
        <span className="glass-fac-stream__card-title">{insight.title}</span>

        {LayerIcon && (
          <span
            className="glass-fac-stream__card-layer"
            data-layer={insight.layer}
          >
            <LayerIcon className="w-3.5 h-3.5" />
          </span>
        )}

        <span className="glass-fac-stream__card-chevron" aria-hidden="true">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>
      </button>

      {expanded && (
        <div className="glass-fac-stream__card-body">
          <p className="glass-fac-stream__card-reasoning">
            {insight.reasoning}
          </p>

          <div className="glass-fac-stream__card-confidence-bar">
            <div
              className="glass-fac-stream__card-confidence-fill"
              data-urgency={urgency}
              style={{ width: `${Math.round(insight.confidence * 100)}%` }}
            />
          </div>

          <div className="glass-fac-stream__card-meta">
            <span className="glass-fac-stream__card-confidence">
              {insight.confidence}% confianza
            </span>
            {insight.metricValue !== undefined && (
              <span className="glass-fac-stream__card-metric">
                {insight.metric && <>{insight.metric}: </>}
                {insight.metricValue.toFixed(1)}
              </span>
            )}
          </div>

          {insight.actionable && cmd && (
            <button
              type="button"
              className={cn(
                "glass-fac-stream__card-action",
                actionState === "executing" && "glass-fac-stream__card-action--executing",
                actionState === "success" && "glass-fac-stream__card-action--success",
                actionState === "error" && "glass-fac-stream__card-action--error",
              )}
              data-urgency={urgency}
              disabled={actionState === "executing"}
              onClick={(e) => {
                e.stopPropagation();
                onAction(cmd);
              }}
            >
              {actionState === "executing" ? (
                <>
                  <Loader2 className="glass-fac-stream__action-spinner" />
                  Ejecutando…
                </>
              ) : actionState === "success" ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Completado
                </>
              ) : actionState === "error" ? (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  Error
                </>
              ) : (
                cmd.label
              )}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface FacilityIntelligenceStreamProps {
  insights: FacilitiesAdvisorInsight[];
  crossDomainSignals: CrossDomainSignal[];
  ambientMode: FacilitiesDashboardMode;
  onExecuteAction?: (command: AdvisorCommand) => Promise<void> | void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function FacilityIntelligenceStream({
  insights,
  crossDomainSignals,
  ambientMode,
  onExecuteAction,
  className,
}: FacilityIntelligenceStreamProps) {
  const rm = useReducedMotion();

  const [activeLayer, setActiveLayer] = useState<
    FacilitiesAdvisorLayer | "all"
  >("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [visibleCount, setVisibleCount] = useState(MAX_VISIBLE);
  const [signalsOpen, setSignalsOpen] = useState(true);

  // ── I4: Action lifecycle state ──
  const [actionStates, setActionStates] = useState<
    Record<string, ActionState>
  >({});
  const [actionResults, setActionResults] = useState<ActionResult[]>([]);
  const [actionHistory, setActionHistory] = useState<ActionResult[]>([]);

  // ── I4: HITL confirmation state ──
  const [hitlCommand, setHitlCommand] = useState<{
    command: AdvisorCommand;
    insightTitle: string;
    insightId: string;
  } | null>(null);

  // ── I4: Feedback auto-dismiss ──
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  // ── Derived data ──

  const sorted = useMemo(
    () => sortInsightsByPriority(insights),
    [insights],
  );

  const filtered = useMemo(() => {
    if (activeLayer === "all") return sorted;
    return sorted.filter((i) => i.layer === activeLayer);
  }, [sorted, activeLayer]);

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  const hasMore = filtered.length > visibleCount;

  const layerCounts = useMemo(() => {
    const counts: Partial<Record<FacilitiesAdvisorLayer | "all", number>> = {
      all: sorted.length,
    };
    for (const insight of sorted) {
      counts[insight.layer] = (counts[insight.layer] ?? 0) + 1;
    }
    return counts;
  }, [sorted]);

  const criticalCount = useMemo(
    () => sorted.filter((i) => i.severity === "critical").length,
    [sorted],
  );

  // ── Handlers ──

  const handleFilter = useCallback(
    (layer: FacilitiesAdvisorLayer | "all") => {
      setActiveLayer(layer);
      setVisibleCount(MAX_VISIBLE);
    },
    [],
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const showMore = useCallback(() => {
    setVisibleCount((c) => c + MAX_VISIBLE);
  }, []);

  // ── I4: Execute action with lifecycle ──
  const executeWithLifecycle = useCallback(
    async (insightId: string, cmd: AdvisorCommand) => {
      // Set executing
      setActionStates((prev) => ({ ...prev, [insightId]: "executing" }));

      try {
        if (onExecuteAction) {
          await onExecuteAction(cmd);
        }

        // Simulate brief delay for UX feedback
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Set success
        setActionStates((prev) => ({ ...prev, [insightId]: "success" }));

        const result: ActionResult = {
          insightId,
          commandLabel: cmd.label,
          state: "success",
          message: `✅ ${cmd.label} completado`,
          timestamp: Date.now(),
        };

        setActionResults((prev) => [...prev, result]);
        setActionHistory((prev) => [result, ...prev].slice(0, MAX_HISTORY));

        // Auto-dismiss feedback
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = setTimeout(() => {
          setActionResults((prev) =>
            prev.filter((r) => r.timestamp !== result.timestamp),
          );
        }, FEEDBACK_AUTO_DISMISS_MS);

        // Reset action state after delay
        setTimeout(() => {
          setActionStates((prev) => ({ ...prev, [insightId]: "idle" }));
        }, 2000);
      } catch (err) {
        // Set error
        setActionStates((prev) => ({ ...prev, [insightId]: "error" }));

        const result: ActionResult = {
          insightId,
          commandLabel: cmd.label,
          state: "error",
          message: `❌ No se pudo ejecutar: ${cmd.label}`,
          timestamp: Date.now(),
        };

        setActionResults((prev) => [...prev, result]);
        setActionHistory((prev) => [result, ...prev].slice(0, MAX_HISTORY));

        // Auto-dismiss feedback
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = setTimeout(() => {
          setActionResults((prev) =>
            prev.filter((r) => r.timestamp !== result.timestamp),
          );
        }, FEEDBACK_AUTO_DISMISS_MS * 2); // errors stay longer

        // Reset action state after delay
        setTimeout(() => {
          setActionStates((prev) => ({ ...prev, [insightId]: "idle" }));
        }, 3000);
      }
    },
    [onExecuteAction],
  );

  // ── I4: Handle action click — route by approval_level ──
  const handleAction = useCallback(
    (insightId: string, insightTitle: string, cmd: AdvisorCommand) => {
      if (cmd.approval_level === "hitl") {
        // Show confirmation modal
        setHitlCommand({ command: cmd, insightTitle, insightId });
      } else {
        // "auto" or "semi" — execute directly
        executeWithLifecycle(insightId, cmd);
      }
    },
    [executeWithLifecycle],
  );

  // ── I4: HITL confirm ──
  const handleHitlConfirm = useCallback(() => {
    if (hitlCommand) {
      executeWithLifecycle(hitlCommand.insightId, hitlCommand.command);
      setHitlCommand(null);
    }
  }, [hitlCommand, executeWithLifecycle]);

  const handleHitlCancel = useCallback(() => {
    setHitlCommand(null);
  }, []);

  // ── I4: Dismiss feedback ──
  const dismissFeedback = useCallback((timestamp: number) => {
    setActionResults((prev) =>
      prev.filter((r) => r.timestamp !== timestamp),
    );
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // RENDER: EMPTY STATE
  // ═══════════════════════════════════════════════════════════════

  if (sorted.length === 0 && crossDomainSignals.length === 0) {
    return (
      <aside
        className={cn("glass-fac-stream", className)}
        data-mode={ambientMode}
        role="complementary"
        aria-label="Stream de inteligencia de espacios"
      >
        <div className="glass-fac-stream__empty">
          <div className="glass-fac-stream__empty-icon">
            <CheckCircle size={28} strokeWidth={1.5} />
          </div>
          <p className="glass-fac-stream__empty-text">
            El sistema no detectó anomalías. El club opera dentro de
            parámetros normales.
          </p>
          <p className="glass-fac-stream__empty-sub">
            Los 18 motores de reglas están monitoreando en tiempo real.
          </p>
        </div>
      </aside>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: FULL STREAM
  // ═══════════════════════════════════════════════════════════════

  return (
    <aside
      className={cn("glass-fac-stream", className)}
      data-mode={ambientMode}
      data-prefers-reduced={rm}
      role="complementary"
      aria-label="Stream de inteligencia de espacios"
    >
      {/* ── Critical Summary Bar ── */}
      {criticalCount > 0 && (
        <div className="glass-fac-stream__critical-bar" role="status">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>
            {criticalCount} alerta{criticalCount > 1 ? "s" : ""} crítica
            {criticalCount > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* ── I4: Action Feedback Toasts ── */}
      {actionResults.length > 0 && (
        <div className="glass-fac-stream__feedbacks">
          {actionResults.map((result) => (
            <ActionFeedback
              key={result.timestamp}
              result={result}
              onDismiss={() => dismissFeedback(result.timestamp)}
            />
          ))}
        </div>
      )}

      {/* ── I4: Action History ── */}
      {actionHistory.length > 0 && (
        <ActionHistory history={actionHistory} />
      )}

      {/* ── Cross-Domain Signals ── */}
      {crossDomainSignals.length > 0 && (
        <section
          className="glass-fac-stream__signals"
          aria-label="Señales cross-domain"
        >
          <button
            type="button"
            className="glass-fac-stream__signals-toggle"
            onClick={() => setSignalsOpen((v) => !v)}
            aria-expanded={signalsOpen}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>
              Señales Cross-Domain ({crossDomainSignals.length})
            </span>
            <span
              className="glass-fac-stream__signals-chevron"
              aria-hidden="true"
            >
              {signalsOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
          </button>

          {signalsOpen && (
            <div className="glass-fac-stream__signals-body">
              {crossDomainSignals.map((signal, i) => (
                <SignalCard
                  key={`${signal.domain}-${i}`}
                  signal={signal}
                  index={i}
                  rm={rm}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Layer Filter Pills ── */}
      {sorted.length > 0 && (
        <nav
          className="glass-fac-stream__filters"
          aria-label="Filtrar por capa"
        >
          <button
            type="button"
            className="glass-fac-stream__pill"
            data-active={activeLayer === "all"}
            onClick={() => handleFilter("all")}
            aria-pressed={activeLayer === "all"}
          >
            Todas
            <span className="glass-fac-stream__pill-count">
              {layerCounts.all ?? 0}
            </span>
          </button>

          {LAYER_ORDER.map((layer) => {
            const layerMeta = FACILITIES_ADVISOR_LAYER_META[layer];
            const PillIcon = LAYER_ICONS[layer];
            const count = layerCounts[layer] ?? 0;
            if (count === 0) return null;

            return (
              <button
                key={layer}
                type="button"
                className="glass-fac-stream__pill"
                data-active={activeLayer === layer}
                data-layer={layer}
                onClick={() => handleFilter(layer)}
                aria-pressed={activeLayer === layer}
              >
                {PillIcon && <PillIcon className="w-3 h-3" />}
                <span className="glass-fac-stream__pill-label">
                  {layerMeta?.label ?? layer}
                </span>
                <span className="glass-fac-stream__pill-count">
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {/* ── Insight Cards ── */}
      {sorted.length > 0 ? (
        <div
          className="glass-fac-stream__body"
          role="feed"
          aria-label="Insights"
        >
          {visible.map((insight, i) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              index={i}
              expanded={expandedIds.has(insight.id)}
              actionState={actionStates[insight.id] ?? "idle"}
              onToggle={() => toggleExpand(insight.id)}
              onAction={(cmd) => handleAction(insight.id, insight.title, cmd)}
              rm={rm}
            />
          ))}

          {hasMore && (
            <button
              type="button"
              className="glass-fac-stream__more"
              onClick={showMore}
            >
              Ver más ({filtered.length - visibleCount} restantes)
            </button>
          )}
        </div>
      ) : (
        <div className="glass-fac-stream__no-insights">
          <p>
            Sin insights activos para esta capa. Las señales cross-domain
            se muestran arriba.
          </p>
        </div>
      )}

      {/* ── I4: HITL Confirmation Modal ── */}
      {hitlCommand && (
        <HitlConfirmModal
          command={hitlCommand.command}
          insightTitle={hitlCommand.insightTitle}
          onConfirm={handleHitlConfirm}
          onCancel={handleHitlCancel}
          ambientMode={ambientMode}
        />
      )}
    </aside>
  );
}