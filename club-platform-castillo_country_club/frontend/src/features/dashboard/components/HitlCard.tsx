/**
 * @component HitlCard (Fase 25)
 * @namespace .glass-hitl__card
 * @depends HitlQueue.css, config/hitl
 * @note Per-item approval card with AI decision context,
 *       smart reject confirmation (countdown bar),
 *       decision feedback overlay, batch checkbox.
 * @import import '../HitlQueue.css';
 */

import { Check, X, Clock, Loader2 } from "lucide-react";
import { cn, timeAgo } from "@/shared/lib/utils";
import {
  PRIORITY_STYLES,
  AGENT_TARGETS,
  type HitlItem,
} from "../config/hitl";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface HitlCardProps {
  item: HitlItem;
  index: number;
  isFocused: boolean;
  isConfirmingReject: boolean;
  feedbackState: "approved" | "rejected" | null;
  isProcessing: boolean;
  isSelected: boolean;
  showCheckbox: boolean;
  onApprove: () => void;
  onReject: () => void;
  onToggleSelect: () => void;
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function HitlCard({
  item,
  index,
  isFocused,
  isConfirmingReject,
  feedbackState,
  isProcessing,
  isSelected,
  showCheckbox,
  onApprove,
  onReject,
  onToggleSelect,
}: HitlCardProps) {
  const priority =
    PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.medium;

  const agentTarget =
    item.agentTarget || AGENT_TARGETS[item.type];

  const hasContext =
    !!agentTarget ||
    !!item.affectedScope ||
    item.reversible !== undefined;

  const isDisabled = isProcessing || !!feedbackState;

  return (
    <div
      className={cn(
        "glass-hitl__card",
        isFocused && "glass-hitl__card--focused",
        feedbackState === "approved" &&
          "glass-hitl__card--approved",
        feedbackState === "rejected" &&
          "glass-hitl__card--rejected",
      )}
      style={{
        animationDelay: `${0.06 * index}s`,
      }}
      role="listitem"
      aria-label={`${item.title} — ${priority.label}`}
    >
      {/* ── Screen reader announcement (aria-live fix) ── */}
      <span className="glass-hitl__sr-only" aria-live="polite">
        {isConfirmingReject
          ? "Presione nuevamente para confirmar rechazo"
          : ""}
      </span>

      {/* ── Feedback overlay ── */}
      {feedbackState && (
        <div
          className={`glass-hitl__card-feedback glass-hitl__card-feedback--${feedbackState}`}
        >
          {feedbackState === "approved" ? (
            <>
              <Check size={16} />
              <span>Aprobado</span>
            </>
          ) : (
            <>
              <X size={16} />
              <span>Rechazado</span>
            </>
          )}
        </div>
      )}

      {/* ── Top: [checkbox] dot title priority ── */}
      <div className="glass-hitl__card-top">
        {showCheckbox && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="glass-hitl__card-checkbox-input"
            aria-label={`Seleccionar ${item.title}`}
            disabled={!!feedbackState}
          />
        )}
        <span
          className="glass-hitl__card-priority-dot"
          style={{ background: priority.dot }}
        />
        <p className="glass-hitl__card-title">{item.title}</p>
        <span className="glass-hitl__card-priority-label">
          {priority.label}
        </span>
      </div>

      {/* ── Description ── */}
      <p className="glass-hitl__card-desc">{item.description}</p>

      {/* ── Meta ── */}
      <div className="glass-hitl__card-meta">
        <span className="glass-hitl__card-meta-item">
          {item.requestedBy}
        </span>
        <span className="glass-hitl__card-meta-item">
          <Clock size={12} strokeWidth={1.5} />
          {timeAgo(item.requestedAt)}
        </span>
      </div>

      {/* ── AI Decision Context ── */}
      {hasContext && (
        <div className="glass-hitl__card-context">
          <span className="glass-hitl__card-context-row glass-hitl__card-context-row--title">
            Si aprobás:
          </span>
          {agentTarget && (
            <span className="glass-hitl__card-context-row">
              → Agente {agentTarget} ejecuta
            </span>
          )}
          {item.affectedScope && (
            <span className="glass-hitl__card-context-row">
              → Alcance: {item.affectedScope}
            </span>
          )}
          {item.reversible !== undefined && (
            <span className="glass-hitl__card-context-row">
              → Reversible: {item.reversible ? "Sí" : "No"}
            </span>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="glass-hitl__card-actions">
        <button
          type="button"
          onClick={onApprove}
          disabled={isDisabled}
          className="glass-hitl__btn-approve"
          aria-label={`Aprobar ${item.title}`}
        >
          {isProcessing ? (
            <Loader2
              size={16}
              className="animate-spin"
              style={{
                animation: "glass-hitl-spin 0.8s linear infinite",
              }}
            />
          ) : (
            <Check size={16} />
          )}
          Aprobar
        </button>

        <button
          type="button"
          onClick={onReject}
          disabled={isDisabled}
          className={cn(
            "glass-hitl__btn-reject",
            isConfirmingReject &&
              "glass-hitl__btn-reject--confirm",
          )}
          aria-label={
            isConfirmingReject
              ? `Confirmar rechazo de ${item.title}`
              : `Rechazar ${item.title}`
          }
        >
          <X size={16} />
          <span className="glass-hitl__btn-reject-text">
            {isConfirmingReject
              ? "Confirmar rechazo"
              : "Rechazar"}
          </span>
          {isConfirmingReject && (
            <span className="glass-hitl__btn-reject-bar" />
          )}
        </button>
      </div>
    </div>
  );
}