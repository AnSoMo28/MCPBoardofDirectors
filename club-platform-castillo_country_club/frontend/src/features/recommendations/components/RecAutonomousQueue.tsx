// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Autonomous Queue (2027 NEW)
//
// "The Orders" — AI-prioritized action queue with readiness states.
//
// Actions are cards sorted by readiness (ready first) then impact_score.
// Each action shows:
//   - Readiness pill (ready/awaiting-approval/data-pending/conflict-blocked)
//   - Priority badge
//   - Impact score bar
//   - Affected domains
//   - Dependency arrows (if blocked by other actions)
//   - Estimated impact description
//
// Act mode hero component. Stagger reveal on mount.
//
// Glass namespace: .glass-raq
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useCallback, useState } from "react";
import {
  Zap,
  CheckCircle2,
  Clock,
  Database,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Link2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";

import type {
  AutonomousAction,
  SchedulingConflict,
  RecommendationMode,
} from "../types";
import {
  ActionReadiness,
  ACTION_READINESS_CONFIG,
  PRIORITY_CONFIG,
  SIGNAL_SOURCE_CONFIG,
  isReadyToExecute,
} from "../types";

import "./RecAutonomousQueue.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface RecAutonomousQueueProps {
  actions: AutonomousAction[];
  conflicts: SchedulingConflict[];
  mode: RecommendationMode;
  reducedMotion: boolean;
  onExecuteAction?: (action: AutonomousAction) => void;
  onApproveAction?: (action: AutonomousAction) => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// ICON RESOLVER
// ═══════════════════════════════════════════════════════════════════════

const READINESS_ICONS: Record<ActionReadiness, typeof CheckCircle2> = {
  [ActionReadiness.Ready]: CheckCircle2,
  [ActionReadiness.AwaitingApproval]: Clock,
  [ActionReadiness.DataPending]: Database,
  [ActionReadiness.ConflictBlocked]: ShieldAlert,
};

// ═══════════════════════════════════════════════════════════════════════
// SORTING — By readiness (ready first), then impact_score (desc)
// ═══════════════════════════════════════════════════════════════════════

function sortActions(actions: AutonomousAction[]): AutonomousAction[] {
  return [...actions].sort((a, b) => {
    const readinessOrder: Record<ActionReadiness, number> = {
      [ActionReadiness.Ready]: 0,
      [ActionReadiness.AwaitingApproval]: 1,
      [ActionReadiness.DataPending]: 2,
      [ActionReadiness.ConflictBlocked]: 3,
    };
    const readinessDiff =
      readinessOrder[a.readiness] - readinessOrder[b.readiness];
    if (readinessDiff !== 0) return readinessDiff;
    return b.impact_score - a.impact_score;
  });
}

// ═══════════════════════════════════════════════════════════════════════
// SINGLE ACTION CARD
// ═══════════════════════════════════════════════════════════════════════

interface ActionCardProps {
  action: AutonomousAction;
  index: number;
  allActions: AutonomousAction[];
  reducedMotion: boolean;
  onExecute?: (action: AutonomousAction) => void;
  onApprove?: (action: AutonomousAction) => void;
}

function ActionCard({
  action,
  index,
  allActions,
  reducedMotion,
  onExecute,
  onApprove,
}: ActionCardProps) {
  const readinessConfig = ACTION_READINESS_CONFIG[action.readiness];
  const ReadinessIcon = READINESS_ICONS[action.readiness];
  const priorityConfig = PRIORITY_CONFIG[action.priority];
  const canExecute = isReadyToExecute(action.readiness);

  // Find dependency actions (actions this one depends on)
  const dependencyActions = useMemo(
    () =>
      action.dependencies
        .map((depId) => allActions.find((a) => a.id === depId))
        .filter(Boolean) as AutonomousAction[],
    [action.dependencies, allActions],
  );

  // Find reverse dependencies (actions that depend on this one)
  const blockedByThis = useMemo(
    () =>
      allActions.filter((a) =>
        a.dependencies.includes(action.id),
      ),
    [action.id, allActions],
  );

  const delayMs = reducedMotion ? 0 : index * 120;

  return (
    <div
      className="raq-card"
      data-readiness={action.readiness}
      data-priority={action.priority}
      style={
        {
          "--stagger-i": index,
          "--card-delay": `${delayMs}ms`,
        } as React.CSSProperties
      }
    >
      {/* ── Card header ────────────────────────────────────────────────── */}
      <div className="raq-card-header">
        {/* Readiness pill */}
        <span className="raq-readiness-pill" data-readiness={action.readiness}>
          <ReadinessIcon size={12} aria-hidden="true" />
          <span>{readinessConfig.label}</span>
        </span>

        {/* Priority badge */}
        <span
          className="raq-priority-badge"
          data-priority={action.priority}
        >
          {priorityConfig.label}
        </span>

        {/* Impact score */}
        <span className="raq-impact-score">
          <span className="raq-impact-value">{action.impact_score}</span>
          <span className="raq-impact-label">impacto</span>
        </span>
      </div>

      {/* ── Card body ──────────────────────────────────────────────────── */}
      <div className="raq-card-body">
        <h4 className="raq-card-title">{action.title}</h4>
        <p className="raq-card-desc">{action.description}</p>

        {/* Impact description */}
        <p className="raq-card-impact-desc">{action.estimated_impact}</p>

        {/* Affected domains */}
        <div className="raq-card-domains">
          {action.affected_domains.map((d) => (
            <span
              key={d}
              className="raq-domain-tag"
              data-signal-source={d}
            >
              {SIGNAL_SOURCE_CONFIG[d]?.label ?? d}
            </span>
          ))}
        </div>

        {/* Dependencies */}
        {dependencyActions.length > 0 && (
          <div className="raq-dependencies">
            <Link2 size={11} aria-hidden="true" className="raq-dep-icon" />
            <span className="raq-dep-label">Depende de:</span>
            {dependencyActions.map((dep) => (
              <span key={dep.id} className="raq-dep-chip">
                {dep.title.length > 25
                  ? `${dep.title.slice(0, 25)}...`
                  : dep.title}
              </span>
            ))}
          </div>
        )}

        {/* Blocked actions indicator */}
        {blockedByThis.length > 0 && (
          <div className="raq-blocks-indicator">
            <ArrowRight size={11} aria-hidden="true" />
            <span>
              Desbloquea {blockedByThis.length} acción
              {blockedByThis.length > 1 ? "es" : ""}
            </span>
          </div>
        )}
      </div>

      {/* ── Card footer — Actions ──────────────────────────────────────── */}
      <div className="raq-card-footer">
        {/* Impact bar */}
        <div className="raq-impact-bar">
          <div className="raq-impact-bar-track">
            <div
              className="raq-impact-bar-fill"
              style={
                {
                  "--impact-pct": `${action.impact_score}%`,
                  "--bar-delay": `${delayMs + 200}ms`,
                } as React.CSSProperties
              }
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="raq-card-actions">
          {canExecute && (
            <button
              type="button"
              className="raq-action-btn"
              data-variant="execute"
              onClick={() => onExecute?.(action)}
            >
              <Zap size={13} aria-hidden="true" />
              <span>Ejecutar</span>
            </button>
          )}

          {action.readiness === ActionReadiness.AwaitingApproval && (
            <button
              type="button"
              className="raq-action-btn"
              data-variant="approve"
              onClick={() => onApprove?.(action)}
            >
              <CheckCircle2 size={13} aria-hidden="true" />
              <span>Aprobar</span>
            </button>
          )}

          {action.readiness === ActionReadiness.ConflictBlocked && (
            <span className="raq-blocked-label">
              <ShieldAlert size={12} aria-hidden="true" />
              Resolver conflicto primero
            </span>
          )}

          {action.readiness === ActionReadiness.DataPending && (
            <span className="raq-pending-label">
              <Database size={12} aria-hidden="true" />
              Esperando datos
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function RecAutonomousQueue({ actions, mode, reducedMotion, onExecuteAction, onApproveAction, className }: RecAutonomousQueueProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // ── Sort actions ────────────────────────────────────────────────────
  const sortedActions = useMemo(
    () => sortActions(actions),
    [actions],
  );

  // ── Summary counts ──────────────────────────────────────────────────
  const summary = useMemo(() => {
    const ready = sortedActions.filter(
      (a) => a.readiness === ActionReadiness.Ready,
    ).length;
    const awaiting = sortedActions.filter(
      (a) => a.readiness === ActionReadiness.AwaitingApproval,
    ).length;
    const blocked = sortedActions.filter(
      (a) => a.readiness === ActionReadiness.ConflictBlocked,
    ).length;
    const pending = sortedActions.filter(
      (a) => a.readiness === ActionReadiness.DataPending,
    ).length;
    const avgImpact =
      sortedActions.length > 0
        ? Math.round(
            sortedActions.reduce((sum, a) => sum + a.impact_score, 0) /
              sortedActions.length,
          )
        : 0;

    return { ready, awaiting, blocked, pending, avgImpact };
  }, [sortedActions]);

  // ── Visible actions ─────────────────────────────────────────────────
  const visibleCount = isExpanded ? sortedActions.length : 5;
  const visibleActions = sortedActions.slice(0, visibleCount);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // ── Empty state ─────────────────────────────────────────────────────
  if (sortedActions.length === 0) {
    return (
      <div className={`glass-raq ${className ?? ""}`} data-empty>
        <div className="raq-header" data-mode={mode}>
          <Zap size={16} aria-hidden="true" className="raq-header-icon" />
          <span className="raq-header-title">Cola de Acciones</span>
        </div>
        <div className="raq-empty">
          <CheckCircle2
            size={36}
            aria-hidden="true"
            className="raq-empty-icon"
          />
          <p className="raq-empty-text">
            Sin acciones pendientes. El motor de síntesis no ha generado
            acciones ejecutables en este momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-raq ${className ?? ""}`}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="raq-header" data-mode={mode}>
        <Zap size={16} aria-hidden="true" className="raq-header-icon" />
        <span className="raq-header-title">Cola de Acciones</span>
        <span className="raq-header-count">{sortedActions.length}</span>
      </div>

      {/* ── Summary strip ─────────────────────────────────────────────── */}
      <div className="raq-summary">
        {summary.ready > 0 && (
          <div className="raq-summary-item" data-readiness="ready">
            <CheckCircle2 size={13} aria-hidden="true" />
            <span className="raq-summary-value">{summary.ready}</span>
            <span className="raq-summary-label">listas</span>
          </div>
        )}
        {summary.awaiting > 0 && (
          <div className="raq-summary-item" data-readiness="awaiting_approval">
            <Clock size={13} aria-hidden="true" />
            <span className="raq-summary-value">{summary.awaiting}</span>
            <span className="raq-summary-label">aprobación</span>
          </div>
        )}
        {summary.blocked > 0 && (
          <div className="raq-summary-item" data-readiness="conflict_blocked">
            <ShieldAlert size={13} aria-hidden="true" />
            <span className="raq-summary-value">{summary.blocked}</span>
            <span className="raq-summary-label">bloqueadas</span>
          </div>
        )}
        {summary.pending > 0 && (
          <div className="raq-summary-item" data-readiness="data_pending">
            <Database size={13} aria-hidden="true" />
            <span className="raq-summary-value">{summary.pending}</span>
            <span className="raq-summary-label">datos</span>
          </div>
        )}
        <div className="raq-summary-item" data-readiness="avg">
          <span className="raq-summary-label">Impacto medio:</span>
          <span className="raq-summary-value">{summary.avgImpact}</span>
        </div>
      </div>

      {/* ── Action cards ──────────────────────────────────────────────── */}
      <div className="raq-body">
        {visibleActions.map((action, idx) => (
          <ActionCard
            key={action.id}
            action={action}
            index={idx}
            allActions={sortedActions}
            reducedMotion={reducedMotion}
            onExecute={onExecuteAction}
            onApprove={onApproveAction}
          />
        ))}

        {/* Expand/collapse */}
        {sortedActions.length > 5 && (
          <button
            type="button"
            className="raq-expand-btn"
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
                <span>Ver {sortedActions.length - 5} acciones más</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Quick execute (if any ready actions exist) ─────────────────── */}
      {summary.ready > 0 && mode === "act" && (
        <div className="raq-quick-execute">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>
            {summary.ready} acción{summary.ready > 1 ? "es" : ""} lista
            {summary.ready > 1 ? "s" : ""} para ejecutar en modo Actuar
          </span>
          <button
            type="button"
            className="raq-execute-all-btn"
            onClick={() => {
              const readyActions = sortedActions.filter(
                (a) => a.readiness === ActionReadiness.Ready,
              );
              readyActions.forEach((a) => onExecuteAction?.(a));
            }}
          >
            <ExternalLink size={12} aria-hidden="true" />
            Ejecutar listas
          </button>
        </div>
      )}
    </div>
  );
}