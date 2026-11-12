/**
 * @component ApprovalCard (Fase 25)
 * @namespace .glass-approval__card
 * @depends ApprovalCard.css, ParamsPreview
 * @note Approval card with expand/collapse, dual approval, expiration countdown,
 *       approve/reject flow, batch checkbox.
 * @import import './ApprovalCard.css';
 */
import "./ApprovalCard.css";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldAlert,
  Check,
  X,
  Clock,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react";
import { Button, showToast } from "@/shared/components/ui";
import { cn, timeAgo } from "@/shared/lib/utils";
import { AGENT_LABELS,
   AGENT_ACCENT,
   APPROVAL_STATUS_CONFIG,
   APPROVAL_LEVEL_CONFIG,
   getRiskColor,
   type ApprovalRequest, } from "./types";
import { ParamsPreview } from "./components/ParamsPreview";

/* ═══════════════════════════════════════
   Expiration Countdown
   ═══════════════════════════════════════ */

function useExpirationCountdown(expiresAt: string | null) {
  const [hoursLeft, setHoursLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setHoursLeft(null);
      return;
    }

    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setHoursLeft(Math.max(0, Math.round(diff / 3_600_000)));
    };

    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return hoursLeft;
}

function ExpirationBadge({ expiresAt }: { expiresAt: string | null }) {
  const hoursLeft = useExpirationCountdown(expiresAt);
  if (hoursLeft === null || hoursLeft >= 24) return null;

  const level =
    hoursLeft < 2 ? "urgent" : hoursLeft < 6 ? "warning" : "normal";

  return (
    <span className={`glass-approval__countdown glass-approval__countdown--${level}`}>
      <Clock size={10} />
      {hoursLeft < 1 ? "<1h" : `${hoursLeft}h`}
    </span>
  );
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

interface ApprovalCardProps {
  request: ApprovalRequest;
  onApprove: (id: string, note: string) => void;
  onReject: (id: string, reason: string) => void;
  isProcessing: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  showCheckbox: boolean;
}

export function ApprovalCard({
  request,
  onApprove,
  onReject,
  isProcessing,
  isSelected,
  onToggleSelect,
  showCheckbox,
}: ApprovalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const statusCfg = APPROVAL_STATUS_CONFIG[request.status];
  const levelCfg = APPROVAL_LEVEL_CONFIG[request.approval_level];
  const agentLabel = AGENT_LABELS[request.agent] ?? request.agent;
  const accent = AGENT_ACCENT[request.agent] ?? "var(--color-silver-400)";
  const isPending = request.status === "pending";
  const isDual = request.approval_level === "always_human";
  const riskColor = getRiskColor(request.risk_summary);
  const StatusIcon = statusCfg.icon;

  const toolDisplayName = request.tool
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div
      className={cn(
        "glass-approval__card",
        isDual && isPending && "glass-approval__card--dual",
        !isPending && "glass-approval__card--resolved",
      )}
    >
      {/* Batch checkbox */}
      {showCheckbox && isPending && (
        <input
          type="checkbox"
          className="glass-approval__card-checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          aria-label={`Seleccionar ${toolDisplayName}`}
        />
      )}

      {/* ── Header ── */}
      <Button
        variant="unstyled"
        type="button"
        className="glass-approval__card-header"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <div
          className="glass-approval__card-icon"
          style={{
            backgroundColor: isDual
              ? "rgba(251, 113, 133, 0.1)"
              : `color-mix(in srgb, ${accent} 12%, transparent)`,
          }}
        >
          {isDual ? (
            <ShieldAlert
              size={18}
              style={{ color: "var(--color-rose-400)" }}
            />
          ) : (
            <Shield size={18} style={{ color: accent }} />
          )}
        </div>

        <div className="glass-approval__card-info">
          <h4 className="glass-approval__card-title">
            {toolDisplayName}
          </h4>

          <div className="glass-approval__card-badges">
            <span
              className="glass-approval__card-badge"
              style={{
                backgroundColor: statusCfg.bgColor,
                color: statusCfg.color,
              }}
            >
              {statusCfg.label}
            </span>
            {isDual && isPending && (
              <span
                className="glass-approval__card-badge"
                style={{
                  backgroundColor: "rgba(251, 113, 133, 0.1)",
                  color: "var(--color-rose-400)",
                }}
              >
                Doble aprobación
              </span>
            )}
            <span
              className="glass-approval__card-badge"
              style={{
                backgroundColor: `color-mix(in srgb, ${accent} 8%, transparent)`,
                color: accent,
              }}
            >
              {agentLabel}
            </span>
            {isPending && (
              <ExpirationBadge expiresAt={request.expires_at} />
            )}
          </div>

          <div className="glass-approval__card-meta">
            <span className="glass-approval__card-meta-item">
              <Users size={12} />
              {request.requested_by}
            </span>
            <span className="glass-approval__card-meta-item">
              <Clock size={12} />
              {timeAgo(request.created_at)}
            </span>
            {request.affected_count > 0 && (
              <span
                className="glass-approval__card-meta-item"
                style={{ color: "var(--color-amber-400)" }}
              >
                <AlertTriangle size={12} />
                Afecta a {request.affected_count}
              </span>
            )}
          </div>

          {request.risk_summary && (
            <p className="glass-approval__card-risk" style={{ color: riskColor }}>
              {request.risk_summary}
            </p>
          )}
        </div>

        <span className="glass-approval__card-expand-btn">
          {expanded ? <ChevronUp /> : <ChevronDown />}
        </span>
      </Button>

      {/* ── Expanded body ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="glass-approval__card-body">
              {/* Level description */}
              <div className="glass-approval__card-section">
                <StatusIcon
                  size={14}
                  style={{ color: levelCfg.color }}
                />
                <span
                  className="text-xs font-[family-name:var(--font-ui)]"
                  style={{ color: levelCfg.color }}
                >
                  {levelCfg.description}
                </span>
              </div>

              {/* Estimated impact */}
              {request.estimated_impact && (
                <div className="glass-approval__card-section">
                  <span className="glass-approval__card-section-title">
                    Impacto estimado
                  </span>
                  <p className="glass-approval__card-section-text">
                    {request.estimated_impact}
                  </p>
                </div>
              )}

              {/* Parameters */}
              {Object.keys(request.params).length > 0 && (
                <div className="glass-approval__card-section">
                  <span className="glass-approval__card-section-title">
                    Parámetros
                  </span>
                  <ParamsPreview
                    tool={request.tool}
                    params={request.params}
                  />
                </div>
              )}

              {/* Resolution info */}
              {!isPending && request.resolution_note && (
                <div className="glass-approval__card-section">
                  <div className="glass-approval__card-resolution">
                    <MessageSquare />
                    <div>
                      <p className="glass-approval__card-resolution-by">
                        Resolución por {request.resolved_by}
                      </p>
                      <p className="glass-approval__card-resolution-text">
                        {request.resolution_note}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Dual approval status */}
              {isDual && request.first_approval_by && (
                <div className="glass-approval__card-section">
                  <div className="glass-approval__card-dual-status">
                    <Shield size={14} />
                    <span className="glass-approval__card-dual-status-text">
                      1ra aprobación: {request.first_approval_by} —
                      Pendiente 2da aprobación
                    </span>
                  </div>
                </div>
              )}

              {/* Actions (pending only) */}
              {isPending && (
                <div className="glass-approval__card-section">
                  {/* Approve note */}
                  <label className="text-xs font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mb-1 block">
                    Nota de aprobación (opcional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Comentario o justificación..."
                    rows={2}
                    className="glass-approval__card-textarea"
                    aria-label="Nota de aprobación"
                  />

                  {/* Reject reason */}
                  {showReject && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="overflow-hidden mt-3"
                    >
                      <label className="text-xs font-medium text-[var(--color-rose-400)] font-[family-name:var(--font-ui)] mb-1 block">
                        Razón de rechazo *
                      </label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Explicá por qué se rechaza esta solicitud..."
                        rows={2}
                        className="glass-approval__card-textarea glass-approval__card-textarea--reject"
                        aria-label="Razón de rechazo"
                      />
                    </motion.div>
                  )}

                  {/* Action buttons */}
                  <div className="glass-approval__card-actions mt-3">
                    {!showReject ? (
                      <>
                        <Button
                          variant="primary"
                          onClick={() => onApprove(request.request_id, note)}
                          disabled={isProcessing}
                          icon={
                            isProcessing ? undefined : (
                              <Check size={16} />
                            )
                          }
                          className="flex-1 bg-[var(--color-emerald-400)] text-[var(--color-abyss)] hover:brightness-110"
                        >
                          {isProcessing ? "Procesando..." : "Aprobar"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setShowReject(true)}
                          icon={<X size={16} />}
                          className="border-2 border-[var(--color-rose-400)] text-[var(--color-rose-400)] hover:bg-[var(--color-rose-400)]/10"
                        >
                          Rechazar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="primary"
                          onClick={() => {
                            if (!rejectReason.trim()) {
                              showToast({
                                type: "error",
                                message:
                                  "La razón de rechazo es obligatoria",
                              });
                              return;
                            }
                            onReject(request.request_id, rejectReason);
                            setShowReject(false);
                            setRejectReason("");
                          }}
                          disabled={isProcessing}
                          icon={<X size={16} />}
                          className="flex-1 bg-[var(--color-rose-400)] text-white hover:brightness-110"
                        >
                          {isProcessing
                            ? "Procesando..."
                            : "Confirmar Rechazo"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setShowReject(false);
                            setRejectReason("");
                          }}
                        >
                          Cancelar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}