/**
 * Toast.tsx
 * src/shared/components/ui/Toast.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @version     v2.1
 * @namespace   .ui-toast (supplements globals.css §6 .glass-toast primitives)
 * @keyframes   1 (ui-toast-slide-up) — in Toast.css
 * @depends     globals.css §1 tokens, lucide-react, @/shared/lib/utils (cn)
 *
 * PRE-WRITE VERIFICATION:
 * [x] cn utility verified in shared/lib/utils
 * [x] X, CheckCircle, AlertCircle, AlertTriangle, Info verified in lucide-react
 * [x] All tokens verified against globals.css §1 (12/12 exist in v2.2)
 * [x] globals.css §6 .glass-toast classes verified as base primitives
 *     (.glass-toast + 4 semantic modifiers confirmed present)
 *
 * ANTI-PATTERNS REMOVED:
 * [x] Tailwind utilities in container → BEM CSS (.ui-toast-wrap__*)
 * [x] text-sm font-medium → CSS font rules
 * [x] flex-shrink-0 → CSS flex-shrink
 * [x] gap-3 → CSS gap
 * [x] inline icon color via Tailwind class → BEM element
 * [x] Missing data-testid → added
 * [x] Missing light mode → added in CSS
 * [x] Missing reduced motion → added in CSS
 * [x] Mutable ToastMessage interface → readonly fields
 *
 * FIXES APPLIED (v2.1) — hallazgos G8 (auditoría Lote 4 / BC-02 package):
 * [x] G8-10: "hover pause" (claim D7) era FALSO — no existía la pausa.
 *     Ahora implementada de verdad: onMouseEnter congela el timer,
 *     onMouseLeave lo reanuda con el tiempo RESTANTE (no reinicia).
 * [x] G8-11: sin API de suscripción el módulo era inobservable
 *     (intestable). subscribeToToasts() añadida — la usa el propio
 *     ToastContainer y la usan tests/e2e.
 * [x] G8-12: aserción non-null sobre message + firma sin overloads →
 *     overloads concretos (type, message) | ({type, message}).
 * [x] G8-13: aria-label en div sin role (atributo muerto para AT) →
 *     role="region"; constantes 250/4000 duplicadas contra CSS →
 *     EXIT_ANIMATION_MS / DEFAULT_TOAST_MS con vínculo documental.
 * [x] G8-15 (css-side): .ui-toast-wrap .ui-toast neutraliza el position:fixed
 *     del primitivo .glass-toast (ver Toast.css §1a) — los items fluían
 *     fuera de la columna y se apilaban superpuestos en top-right.
 */

// ═══ React core ═══
import {
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";

// ═══ Third-party ═══
import {
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
} from "lucide-react";

// ═══ Shared — values ═══
import { cn } from "@/shared/lib/utils";
import "./Toast.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   ═══════════════════════════════════════════════════════════════ */

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  readonly id: string;
  readonly type: ToastType;
  readonly message: string;
  readonly duration?: number;
}

/** Listener de toasts nuevos (showToast emissions). */
export type ToastListener = (toast: ToastMessage) => void;


/* ═══════════════════════════════════════════════════════════════
   §2  CONSTANTS — contrato TSX ↔ CSS
   ═══════════════════════════════════════════════════════════════ */

/** Duración por defecto del toast (ms). */
const DEFAULT_TOAST_MS = 4_000;

/**
 * Gracia de salida (ms) — DEBE coincidir con la transición de exit
 * 0.25s de Toast.css §1 (ui-toast--exit). El vínculo está comentado
 * en ambos lados.
 */
const EXIT_ANIMATION_MS = 250;


/* ═══════════════════════════════════════════════════════════════
   §3  IMPERATIVE API — showToast() / subscribeToToasts()
   Global listener pattern for imperative toast creation.
   Overloads type-safe (G8-12): (type, message) | ({ type, message }).
   ═══════════════════════════════════════════════════════════════ */

const toastListeners = new Set<ToastListener>();
let toastSeq = 0;

function nextToastId(): string {
  toastSeq += 1;
  return `toast_${toastSeq}`;
}

export function showToast(
  type: ToastType,
  message: string,
  duration?: number,
): void;
export function showToast(toast: {
  readonly type: ToastType;
  readonly message: string;
  readonly duration?: number;
}): void;
export function showToast(
  typeOrObj:
    | ToastType
    | { readonly type: ToastType; readonly message: string; readonly duration?: number },
  message?: string,
  duration?: number,
): void {
  const toast: ToastMessage = typeof typeOrObj === "object"
    ? {
        id: nextToastId(),
        type: typeOrObj.type,
        message: typeOrObj.message,
        duration: typeOrObj.duration ?? DEFAULT_TOAST_MS,
      }
    : {
        id: nextToastId(),
        type: typeOrObj,
        // El overload (type, message) exige message; `?? ""` blinda
        // llamadas JS sin tipar en runtime.
        message: message ?? "",
        duration: duration ?? DEFAULT_TOAST_MS,
      };
  toastListeners.forEach((listener) => listener(toast));
}

/**
 * Subscribe to toast emissions. Returns an unsubscribe function.
 * Used by ToastContainer itself and by tests/e2e observability (G8-11).
 */
export function subscribeToToasts(listener: ToastListener): () => void {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
}


/* ═══════════════════════════════════════════════════════════════
   §4  CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const ICON_MAP: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};


/* ═══════════════════════════════════════════════════════════════
   §5  COMPONENT — ToastItem
   Single toast notification. Auto-dismisses after duration, with
   REAL hover-pause (G8-10): the timer freezes on mouseenter and
   resumes with the REMAINING time on mouseleave.
   Entrance + exit CSS lifecycle.
   ═══════════════════════════════════════════════════════════════ */

function ToastItem({
  toast,
  onDismiss,
}: {
  readonly toast: ToastMessage;
  readonly onDismiss: (id: string) => void;
}) {
  const [exiting, setExiting] = useState(false);
  const [paused, setPaused] = useState(false);
  const Icon = ICON_MAP[toast.type];
  const duration = toast.duration ?? DEFAULT_TOAST_MS;

  // Hover-pause bookkeeping (G8-10)
  const remainingMsRef = useRef(duration);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    window.clearTimeout(timerRef.current);
  }, []);

  const handleDismiss = useCallback(() => {
    clearTimer();
    setExiting(true);
    // Removal waits for the CSS exit transition — Toast.css §1 (0.25s)
    // is bound to EXIT_ANIMATION_MS.
    window.setTimeout(() => onDismiss(toast.id), EXIT_ANIMATION_MS);
  }, [clearTimer, onDismiss, toast.id]);

  // Initial schedule — runs once (all deps stable)
  useEffect(() => {
    startedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(handleDismiss, remainingMsRef.current);
    return clearTimer;
  }, [clearTimer, handleDismiss]);

  // D7 hover pause: hold auto-dismiss while the user reads/interacts
  const pauseTimer = useCallback(() => {
    window.clearTimeout(timerRef.current);
    remainingMsRef.current = Math.max(
      remainingMsRef.current - (Date.now() - startedAtRef.current),
      0,
    );
    setPaused(true);
  }, []);

  const resumeTimer = useCallback(() => {
    setPaused(false);
    startedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(handleDismiss, remainingMsRef.current);
  }, [handleDismiss]);

  return (
    <div
      role="status"
      data-testid="ui-toast"
      data-paused={paused || undefined}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      className={cn(
        "ui-toast",
        `glass-toast glass-toast--${toast.type}`,
        exiting && "ui-toast--exit",
      )}
    >
      <Icon
        size={18}
        strokeWidth={1.5}
        className={cn("ui-toast__icon", `ui-toast__icon--${toast.type}`)}
        aria-hidden="true"
      />
      <p className="ui-toast__message">{toast.message}</p>
      <button
        type="button"
        onClick={handleDismiss}
        className="ui-toast__dismiss"
        aria-label="Cerrar notificación"
      >
        <X size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   §6  COMPONENT — ToastContainer
   Renders active toasts in a fixed stack.
   Listens for new toasts via subscribeToToasts (G8-11).
   ═══════════════════════════════════════════════════════════════ */

export function ToastContainer() {
  const [toasts, setToasts] = useState<ReadonlyArray<ToastMessage>>([]);

  const handleNewToast = useCallback((toast: ToastMessage) => {
    setToasts((prev) => [...prev, toast]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // subscribeToToasts returns the unsubscribe fn — perfect effect cleanup
  useEffect(() => subscribeToToasts(handleNewToast), [handleNewToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      data-testid="ui-toast-container"
      role="region"
      aria-label="Notificaciones"
      className="ui-toast-wrap"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}
