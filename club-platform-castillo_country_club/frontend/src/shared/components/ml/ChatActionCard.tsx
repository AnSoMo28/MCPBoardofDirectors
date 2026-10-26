// src/shared/components/ml/ChatActionCard.tsx
// Fase 23 — Silver Tide Chat Action Card
// Glass · Bug fix · Auto-execute · State choreography · Risk encoding
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Loader2, Check, AlertTriangle, Shield, ExternalLink,
} from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { cn } from "@/shared/lib/utils";
import './ChatActionCard.css';

/* ──────────────────────────────────────
   Types
   ────────────────────────────────────── */

export interface ChatAction {
  id: string;
  label: string;
  description: string;
  server: string;
  tool: string;
  params: Record<string, unknown>;
  approval_level: "auto" | "semi" | "hitl";
  estimated_impact?: string;
  risk_summary?: string;
  confirm_message?: string;
  route?: string;
}

type ActionState = "idle" | "confirming" | "executing" | "done" | "error";

/* ──────────────────────────────────────
   Approval config
   ────────────────────────────────────── */

const APPROVAL_CONFIG: Record<
  ChatAction["approval_level"],
  {
    label: string;
    color: string;
    icon: typeof Zap;
    borderClass: string;
    autoExecute: boolean;
  }
> = {
  auto: {
    label: "Auto",
    color: "var(--color-emerald-400)",
    icon: Zap,
    borderClass: "glass-chat-action--auto",
    autoExecute: true,
  },
  semi: {
    label: "Semi-auto",
    color: "var(--color-amber-400)",
    icon: AlertTriangle,
    borderClass: "glass-chat-action--semi",
    autoExecute: false,
  },
  hitl: {
    label: "Requiere aprobación",
    color: "var(--color-rose-400)",
    icon: Shield,
    borderClass: "glass-chat-action--hitl",
    autoExecute: false,
  },
};

/* ──────────────────────────────────────
   Animation variants
   ────────────────────────────────────── */

const containerVariants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.15 } },
};
/* ──────────────────────────────────────
   Component
   ────────────────────────────────────── */

interface Props {
  action: ChatAction;
  onExecute?: (action: ChatAction) => Promise<void>;
  onNavigate?: (route: string) => void;
  compact?: boolean;
  className?: string;
}

export function ChatActionCard({
  action,
  onExecute,
  onNavigate,
  compact = false,
  className,
}: Props) {
  const [state, setState] = useState<ActionState>("idle");

  const approvalCfg = APPROVAL_CONFIG[action.approval_level] ?? APPROVAL_CONFIG.semi;
  const ApprovalIcon = approvalCfg.icon;

  /* ── Auto-execute for AUTO approval level ── */
  useEffect(() => {
    if (!approvalCfg.autoExecute || state !== "idle" || !onExecute) return;

    const timer = setTimeout(async () => {
      setState("executing");
      try {
        await onExecute(action);
        setState("done");
      } catch {
        setState("error");
      }
    }, 600);

    return () => clearTimeout(timer);
    // Only on mount for auto-execute
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Handlers ── */
  const handlePrimaryAction = useCallback(async () => {
    if (action.approval_level === "hitl" && state === "idle") {
      setState("confirming");
      return;
    }

    setState("executing");
    try {
      if (onExecute) await onExecute(action);
      setState("done");
    } catch {
      setState("error");
    }
  }, [action, onExecute, state]);

  const handleCancel = useCallback(() => {
    setState("idle");
  }, []);

  const handleRetry = useCallback(() => {
    setState("idle");
  }, []);

  /* ────────────────────────────────────
     Render states
     ──────────────────────────────────── */

  return (
    <AnimatePresence mode="wait">
      {/* ═══ Done state ═══ */}
      {state === "done" && (
        <motion.div
          key="done"
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className={cn("glass-chat-action glass-chat-action--done", className)}
        >
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <Check className="w-3.5 h-3.5 text-[var(--color-emerald-400)]" />
            </motion.div>
            <span className="glass-chat-action__status-text glass-chat-action__status-text--done">
              {action.label} — ejecutado
            </span>
          </div>
        </motion.div>
      )}

      {/* ═══ Error state ═══ */}
      {state === "error" && (
        <motion.div
          key="error"
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className={cn("glass-chat-action glass-chat-action--error", className)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-rose-400)]" />
              <span className="glass-chat-action__status-text glass-chat-action__status-text--error">
                Error al ejecutar
              </span>
            </div>
            <button onClick={handleRetry} className="glass-chat-action__retry">
              Reintentar
            </button>
          </div>
        </motion.div>
      )}

      {/* ═══ Confirming state (HITL) ═══ */}
      {state === "confirming" && (
        <motion.div
          key="confirming"
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className={cn("glass-chat-action glass-chat-action--confirming", className)}
        >
          <div className="flex items-start gap-2 mb-2.5">
            <Shield className="w-3.5 h-3.5 text-[var(--color-amber-400)] mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="glass-chat-action__confirm-text">
                {action.confirm_message ?? `¿Confirmar "${action.label}"?`}
              </p>
              {action.risk_summary && (
                <p className="glass-chat-action__risk">
                  Riesgo: {action.risk_summary}
                </p>
              )}
              {action.estimated_impact && (
                <span className="glass-chat-action__impact-badge">
                  {action.estimated_impact}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrimaryAction}
              icon={<Check className="w-3 h-3" />}
              className="text-[11px] min-h-[32px]"
            >
              Confirmar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-[11px] text-[var(--color-silver-400)] min-h-[32px]"
            >
              Cancelar
            </Button>
          </div>
        </motion.div>
      )}

      {/* ═══ Executing state ═══ */}
      {state === "executing" && (
        <motion.div
          key="executing"
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className={cn("glass-chat-action glass-chat-action--executing", className)}
        >
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-teal-400)]" />
            <span className="glass-chat-action__status-text">
              Ejecutando {action.label}...
            </span>
          </div>
        </motion.div>
      )}

      {/* ═══ Idle state (default) ═══ */}
      {state === "idle" && (
        <motion.div
          key="idle"
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className={cn(
            "glass-chat-action",
            approvalCfg.borderClass,
            compact && "glass-chat-action--compact",
            className,
          )}
        >
          <div className="flex items-center gap-2">
            {/* Approval icon */}
            <div className="glass-chat-action__icon-wrap"
              style={{
                background: `color-mix(in srgb, ${approvalCfg.color} 10%, transparent)`,
                color: approvalCfg.color,
              }}
            >
              <ApprovalIcon className="w-3 h-3" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={cn("glass-chat-action__label", compact && "glass-chat-action__label--compact")}>
                {action.label}
              </p>
              {!compact && (
                <p className="glass-chat-action__desc">
                  {action.description}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {action.route && onNavigate && (
                <button
                  onClick={() => onNavigate(action.route!)}
                  className="glass-chat-action__route-btn"
                  title="Ir a vista"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}

              <button
                onClick={handlePrimaryAction}
                className="glass-chat-action__execute-btn"
              >
                <Zap className="w-3 h-3" />
                {action.approval_level === "hitl" ? "Revisar" : "Ejecutar"}
              </button>
            </div>
          </div>

          {/* Impact */}
          {action.estimated_impact && !compact && (
            <div className="glass-chat-action__impact">
              <span>Impacto estimado:</span>
              <span style={{ color: "var(--color-teal-400)" }}>{action.estimated_impact}</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}