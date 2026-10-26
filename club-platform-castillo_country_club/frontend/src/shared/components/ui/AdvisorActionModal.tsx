/**
 * AdvisorActionModal.tsx
 * src/shared/components/ui/AdvisorActionModal.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @namespace   .ui-aam
 * @keyframes   4 (ui-aam-contentReveal, ui-aam-hitl-pulse,
 *                 ui-aam-countdown-spin, ui-aam-spin)
 * @depends     globals.css §1 tokens, §8 keyframes, Button.tsx
 *
 * PRE-WRITE VERIFICATION:
 * [x] AdvisorCommand verified in shared/types/ai-intelligence
 * [x] Button component verified in shared/components/ui/Button
 * [x] useReducedMotion verified in shared/hooks/useReducedMotion
 * [x] cn utility verified in shared/lib/utils
 * [x] All lucide-react icons verified (AlertTriangle, Shield, Zap,
 *     X, Loader2, CheckCircle2, Clock)
 *
 * ANTI-PATTERNS REMOVED:
 * [x] framer-motion → CSS-only animations (transition + @keyframes)
 * [x] Tailwind utilities → BEM CSS classes (.ui-aam__*)
 * [x] Inline styles for colors → data-domain attribute selectors
 * [x] Default export → Named export
 * [x] Generic keyframe names → ui-aam-* namespaced
 * [x] Missing focus trap → full WCAG 2.1 AA trap implemented
 * [x] Missing aria-live → assertive on error, polite on success
 * [x] Mutable props interface → all readonly
 * [x] Unused APPROVAL_CONFIG.color field → removed
 */

// ═══ React core ═══
import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

// ═══ Third-party ═══
import {
  AlertTriangle,
  Shield,
  Zap,
  X,
  Loader2,
  CheckCircle2,
  Clock,
} from "lucide-react";

// ═══ Shared — values ═══
import { Button } from "./Button";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { cn } from "@/shared/lib/utils";

// ═══ Shared — types ═══
import type { AdvisorCommand } from "@/shared/types/ai-intelligence";

// ═══ Styles ═══
import "./AdvisorActionModal.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   ═══════════════════════════════════════════════════════════════ */

export type AdvisorActionState = "idle" | "loading" | "done" | "error";

interface AdvisorActionModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly action: AdvisorCommand;
  readonly insightTitle: string;
  readonly insightReasoning: string;
  readonly executionState: AdvisorActionState;
}


/* ═══════════════════════════════════════════════════════════════
   §2  CONSTANTS
   Approval level config — drives border color, badge, countdown.
   Domain tone — maps server name to data-domain attribute value.
   ═══════════════════════════════════════════════════════════════ */

const APPROVAL_CONFIG: Record<
  string,
  {
    readonly label: string;
    readonly icon: typeof Shield;
    readonly panelClass: string;
    readonly badgeClass: string;
    readonly countdownMs: number;
  }
> = {
  auto: {
    label: "Ejecución directa",
    icon: Zap,
    panelClass: "ui-aam--auto",
    badgeClass: "ui-aam__badge--auto",
    countdownMs: 0,
  },
  semi: {
    label: "Requiere confirmación",
    icon: Shield,
    panelClass: "ui-aam--semi",
    badgeClass: "ui-aam__badge--semi",
    countdownMs: 1000,
  },
  hitl: {
    label: "Requiere aprobación humana",
    icon: AlertTriangle,
    panelClass: "ui-aam--hitl",
    badgeClass: "ui-aam__badge--hitl",
    countdownMs: 3000,
  },
};

const DOMAIN_TONES: Record<string, string> = {
  financial: "gold",
  events: "teal",
  family: "teal",
  engagement: "amber",
  communication: "amber",
  sports: "gold",
  ml_intelligence: "gold",
};


/* ═══════════════════════════════════════════════════════════════
   §3  COMPONENT — AdvisorActionModal
   CSS-only animations. Zero framer-motion.
   Focus trap + scroll lock + escape + countdown.
   ═══════════════════════════════════════════════════════════════ */

export function AdvisorActionModal({
  isOpen,
  onClose,
  onConfirm,
  action,
  insightTitle,
  insightReasoning,
  executionState,
}: AdvisorActionModalProps) {

  /* ─── §3.1  Refs ─────────────────────────────────────────── */

  const modalRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const prefersReduced = useReducedMotion();


  /* ─── §3.2  State ────────────────────────────────────────── */

  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [countdownActive, setCountdownActive] = useState(false);
  const [executedAt, setExecutedAt] = useState<Date | null>(null);


  /* ─── §3.3  Derived ──────────────────────────────────────── */

  const approvalCfg = APPROVAL_CONFIG[action.approval_level] ?? APPROVAL_CONFIG.semi;
  const ApprovalIcon = approvalCfg.icon;
  const isExecuting = executionState === "loading";
  const isDone = executionState === "done";
  const isError = executionState === "error";
  const canConfirm = !isExecuting && !countdownActive;
  const domainTone = DOMAIN_TONES[action.server] ?? "silver";


  /* ─── §3.4  Effects — Lifecycle ──────────────────────────── */

  // Open/close animation lifecycle
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      // ── Opening ──
      wasOpenRef.current = true;
      setShouldRender(true);
      previousFocusRef.current = document.activeElement as HTMLElement;

      if (prefersReduced) {
        setIsVisible(true);
      } else {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsVisible(true);
          });
        });
      }
    } else if (!isOpen && wasOpenRef.current) {
      // ── Closing ──
      wasOpenRef.current = false;
      setIsVisible(false);

      if (prefersReduced) {
        setShouldRender(false);
        previousFocusRef.current?.focus();
        previousFocusRef.current = null;
      } else {
        const timer = setTimeout(() => {
          setShouldRender(false);
          previousFocusRef.current?.focus();
          previousFocusRef.current = null;
        }, 250);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, prefersReduced]);

  // Body scroll lock
  useEffect(() => {
    if (shouldRender) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [shouldRender]);


  /* ─── §3.5  Effects — Focus Trap ─────────────────────────── */

  useEffect(() => {
    if (!isVisible || !modalRef.current) return;

    const els = modalRef.current.querySelectorAll<HTMLElement>(
      "button:not([disabled]), [href], input:not([disabled]), " +
      "select:not([disabled]), textarea:not([disabled]), " +
      "[tabindex]:not([tabindex=\"-1\"])"
    );
    if (els.length === 0) return;

    const first = els[0];
    const last = els[els.length - 1];
    first.focus();

    function handleTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isVisible]);


  /* ─── §3.6  Effects — Escape + Countdown + Tracking ──────── */

  // Escape to close
  useEffect(() => {
    if (!isVisible) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && executionState !== "loading") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isVisible, executionState, onClose]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || approvalCfg.countdownMs === 0) {
      setCountdown(0);
      setCountdownActive(false);
      return;
    }

    const total = Math.ceil(approvalCfg.countdownMs / 1000);
    setCountdown(total);
    setCountdownActive(true);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCountdownActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, approvalCfg.countdownMs]);

  // Execution timestamp tracking
  useEffect(() => {
    if (executionState === "done" && !executedAt) setExecutedAt(new Date());
    if (executionState === "idle") setExecutedAt(null);
  }, [executionState, executedAt]);


  /* ─── §3.7  Handlers ─────────────────────────────────────── */

  const handleOverlayClick = useCallback(() => {
    if (!isExecuting) onClose();
  }, [isExecuting, onClose]);


  /* ─── §3.8  Render ───────────────────────────────────────── */

  if (!shouldRender) return null;

  return (
    <div
      data-testid="ui-aam"
      className={cn(
        "ui-aam__overlay",
        isVisible && "ui-aam__overlay--visible",
      )}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Confirmar: ${action.label}`}
        data-approval={action.approval_level}
        className={cn(
          "ui-aam__panel",
          isVisible && "ui-aam__panel--visible",
          approvalCfg.panelClass,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isExecuting}
          className="ui-aam__close"
          aria-label="Cerrar modal"
        >
          <X size={16} />
        </button>

        {/* Content body — stagger cascade */}
        <div className="ui-aam__body">

          {/* Badge row */}
          <div className="ui-aam__badge-row">
            <span className={cn("ui-aam__badge", approvalCfg.badgeClass)}>
              <ApprovalIcon size={14} aria-hidden="true" />
              {approvalCfg.label}
            </span>
          </div>

          {/* Title + reasoning */}
          <div className="ui-aam__header">
            <h3 className="ui-aam__title">{action.label}</h3>
            <p className="ui-aam__reasoning">
              {action.confirm_message ?? insightReasoning}
            </p>
          </div>

          {/* Context card — risk encoding */}
          <div className="ui-aam__context">
            <div className="ui-aam__context-row">
              <span className="ui-aam__context-label">Insight</span>
              <span className="ui-aam__context-value ui-aam__context-value--insight">
                {insightTitle}
              </span>
            </div>

            {action.estimated_impact && (
              <div className="ui-aam__context-row">
                <span className="ui-aam__context-label">Impacto</span>
                <span className="ui-aam__context-value ui-aam__context-value--impact">
                  {action.estimated_impact}
                </span>
              </div>
            )}

            {action.risk_summary && (
              <div className="ui-aam__context-row">
                <span className="ui-aam__context-label">Riesgo</span>
                <span className="ui-aam__context-value ui-aam__context-value--risk">
                  {action.risk_summary}
                </span>
              </div>
            )}

            <div className="ui-aam__context-row">
              <span className="ui-aam__context-label">Destino</span>
              <span
                className="ui-aam__domain-chip"
                data-domain={domainTone}
              >
                {action.server}.{action.tool}
              </span>
            </div>
          </div>

          {/* Error state */}
          {isError && (
            <div
              className="ui-aam__state ui-aam__state--error"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle size={16} aria-hidden="true" />
              <p>Error al ejecutar la acción. Intentá de nuevo.</p>
            </div>
          )}

          {/* Success state */}
          {isDone && (
            <div
              className="ui-aam__state ui-aam__state--success"
              role="status"
              aria-live="polite"
            >
              <CheckCircle2 size={16} aria-hidden="true" />
              <div>
                <p>Acción ejecutada correctamente.</p>
                {executedAt && (
                  <span className="ui-aam__timestamp">
                    <Clock size={12} aria-hidden="true" />
                    Ejecutada hace {Math.round((Date.now() - executedAt.getTime()) / 1000)}s
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="ui-aam__actions">
            {!isDone ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  disabled={isExecuting}
                  className="ui-aam__action-btn"
                >
                  Cancelar
                </Button>
                <Button
                  ref={confirmRef}
                  variant="primary"
                  size="sm"
                  onClick={onConfirm}
                  disabled={!canConfirm}
                  icon={
                    isExecuting ? (
                      <Loader2 size={16} className="ui-aam__spinner" aria-hidden="true" />
                    ) : countdownActive ? (
                      <span className="ui-aam__countdown" aria-hidden="true">
                        {countdown}
                      </span>
                    ) : (
                      <Zap size={16} aria-hidden="true" />
                    )
                  }
                  className="ui-aam__action-btn"
                >
                  {isExecuting
                    ? "Ejecutando..."
                    : countdownActive
                      ? `Confirmando en ${countdown}...`
                      : "Confirmar ejecución"}
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={onClose}
                className="ui-aam__action-btn"
              >
                Cerrar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}