// src/shared/components/auth/PermissionGate.tsx
// ═══════════════════════════════════════════════════════════
// Shared Auth — Permission Gate
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @role        Senior Expert UI/UX, AI/ML, Architecture
// @namespace   .perm-* (permission gate)
// @keyframes   3 (perm-overlay-in, perm-badge-breathe,
//                 perm-unlock-sweep) — in PermissionGate.css
// @depends     globals.css §1 tokens, shared/hooks/usePermissionGate,
//              shared/hooks/useReducedMotion, shared/hooks/usePermissionContext,
//              shared/components/auth/PermissionDenied,
//              lucide-react (Lock)
//
// Access control gate with 3 rendering modes:
//   "hide"     — swaps children for denied surface (default)
//   "dim"      — renders children behind blurred overlay with lock badge
//   "readonly" — renders children with "read only" bar, intercepts clicks
//
// Features:
//   - Debug overlay in development (shows check details)
//   - Telemetry events on denied/granted transitions
//   - Unlock sweep animation on denied→granted
//   - Reduced motion support
//   - CSS-only transitions (no framer-motion)
//
// ANTI-PATTERNS REMOVED:
// [x] framer-motion (AnimatePresence, motion.div) → CSS transitions
// [x] Non-Apple easing [0.16,1,0.3,1] → var(--ease-apple)
// [x] glass-perm namespace → perm-* (auth-specific)
// [x] No data-testid → added on all states
// [x] No § markers → §0-§6
// [x] Inline style={{ color }} in DebugOverlay → CSS custom properties
// [x] No print styles → added
// [x] No responsive → added
// [x] No reduced motion → added (CSS + JS)
//
// FIXES v2.1 — Auditoría G9 (Paquete 1 · REQUEST 1 §13 #7):
// [x] G9-18 (P1) La interceptación readonly era por BURBUJA: el onClick del
//     hijo se ejecutaba ANTES de que el evento subiera al wrapper → los
//     controles prohibidos actuaban igual ("Solo lectura" decorativo).
//     AHORA onClickCapture + preventDefault + stopPropagation: el evento
//     NUNCA desciende a los hijos; además el CSS (perm-ro__content--intercepted
//     ::after) aporta defensa en profundidad para estados no-click.
// [x] G9-19 (P2) Timeout del tooltip sin ref ni cleanup: clics repetidos
//     apilaban timers y cortaban el tooltip antes de tiempo. AHORA ref único
//     + clearTimeout antes de re-programar + cleanup en unmount.
// [x] G9-20 (P2) Telemetría duplicable (deniedReason A→B→A o loading→denied
//     re-emitían el evento "denied" idéntico). AHORA dedupe por firma
//     (razón+rol+permisos+roles requeridos) con reset al conceder. El
//     hack import+eslint-disable se reemplaza por re-export directo
//     `export … from` (una línea, cero imports muertos).
//
// FIX v2.2 — Auditoría G10 (cierre del cluster auth):
// [x] BC-05: UserRole importa del canon shared/types/permissions
//     (stores/auth.store re-exporta para compat) — cero imports
//     cross-layer en la capa shared.
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Lock } from "lucide-react";

// Shared — Hooks
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import {
  usePermissionGate,
  permissionEvents,
  type UsePermissionGateOptions,
  type PermissionGateResult,
} from "@/shared/hooks/usePermissionGate";

// Shared — Types (BC-05: canon de acceso en shared/types/permissions)
import type { Permission, UserRole } from "@/shared/types/permissions";
import { PermissionDenied } from "./PermissionDenied";

// Styles
import "./PermissionGate.css";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 TYPES
// ═══════════════════════════════════════════════════════════

interface PermissionGateProps extends UsePermissionGateOptions {
  readonly children: ReactNode;
  /** Custom fallback when access is denied (mode="hide" only) */
  readonly fallback?: ReactNode;
  /**
   * Rendering mode for denied state:
   * - "hide": swap children for denied surface (default)
   * - "dim": children behind blurred overlay with lock badge
   * - "readonly": children with read-only bar, click intercept
   */
  readonly mode?: "hide" | "dim" | "readonly";
  /** Show development debug overlay with check details */
  readonly debug?: boolean;
  /** Custom message for dim/readonly mode badges */
  readonly degradedMessage?: string;
  /** Fires when permission is denied (telemetry) */
  readonly onDenied?: (result: PermissionGateResult) => void;
  /** Fires when user clicks "Request access" in denied surface */
  readonly onRequestAccess?: () => void;
}

// ═══════════════════════════════════════════════════════════
// §2 CONSTANTS
// ═══════════════════════════════════════════════════════════

const isDev = import.meta.env.DEV;

/** Duración visible del tooltip "Solo lectura" (ms). */
const READONLY_TOOLTIP_MS = 2_000;

/** Duración del sweep de desbloqueo (ms) — sincronizado con CSS. */
const UNLOCK_SWEEP_MS = 800;

// ═══════════════════════════════════════════════════════════
// §3 SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

/**
 * Debug overlay — development only.
 * Shows permission check details: status, roles, permissions.
 * Rendered only in DEV mode when debug=true.
 */
function DebugOverlay({ result, roles, mode }: {
  readonly result: PermissionGateResult;
  readonly roles?: readonly UserRole[];
  readonly permissions?: readonly Permission[];
  readonly mode: "hide" | "dim" | "readonly";
}) {
  const { checkDetails } = result;
  const statusClass =
    result.status === "granted"
      ? "perm__debug-status--granted"
      : result.status === "denied"
        ? "perm__debug-status--denied"
        : "perm__debug-status--loading";

  return (
    <div className="perm__debug" aria-hidden="true" data-testid="perm-debug">
      <div className="perm__debug-title">
        <Lock size={12} /> PermissionGate [DEV]
      </div>

      <div className="perm__debug-row">
        <span>Status</span>
        <span className={cn("perm__debug-status", statusClass)}>
          {result.status.toUpperCase()}
        </span>
      </div>

      {result.deniedReason && (
        <div className="perm__debug-row">
          <span>Reason</span>
          <span>{result.deniedReason}</span>
        </div>
      )}

      <div className="perm__debug-row">
        <span>Mode</span>
        <span>{mode}</span>
      </div>

      {checkDetails.roleCheck && (
        <>
          <div className="perm__debug-divider" />
          <div className="perm__debug-row">
            <span>Role Check</span>
            <span
              className={cn(
                "perm__debug-status",
                checkDetails.roleCheck.passed
                  ? "perm__debug-status--granted"
                  : "perm__debug-status--denied",
              )}
            >
              {checkDetails.roleCheck.passed ? "✓" : "✗"}
            </span>
          </div>
          <div className="perm__debug-row">
            <span>Required</span>
            <span>{checkDetails.roleCheck.required.join(", ")}</span>
          </div>
          <div className="perm__debug-row">
            <span>Actual</span>
            <span>{result.user?.role ?? "—"}</span>
          </div>
        </>
      )}

      {checkDetails.permissionCheck && (
        <>
          <div className="perm__debug-divider" />
          <div className="perm__debug-row">
            <span>Perm Check ({checkDetails.permissionCheck.mode})</span>
            <span
              className={cn(
                "perm__debug-status",
                checkDetails.permissionCheck.passed
                  ? "perm__debug-status--granted"
                  : "perm__debug-status--denied",
              )}
            >
              {checkDetails.permissionCheck.passed ? "✓" : "✗"}
            </span>
          </div>
          {checkDetails.permissionCheck.results.map((r) => (
            <div className="perm__debug-row perm__debug-row--nested" key={r.permission}>
              <span>{r.permission}</span>
              <span>{r.granted ? "✓" : "✗"}</span>
            </div>
          ))}
        </>
      )}

      {roles && roles.length > 0 && !checkDetails.roleCheck && (
        <>
          <div className="perm__debug-divider" />
          <div className="perm__debug-row">
            <span>Roles</span>
            <span>{roles.join(", ")}</span>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * PermissionGate — access control wrapper with 3 rendering modes.
 *
 * Checks user permissions via usePermissionGate hook.
 * Renders children if allowed, or mode-appropriate denied state.
 * CSS-only transitions — no framer-motion dependency.
 */
export function PermissionGate({
  children,
  fallback,
  mode = "hide",
  debug = false,
  degradedMessage,
  onDenied,
  onRequestAccess,
  ...gateOptions
}: PermissionGateProps) {
  const result = usePermissionGate(gateOptions);
  const prefersReducedMotion = useReducedMotion();

  /* ── §4.1 Transition tracking ── */
  const prevStatusRef = useRef(result.status);
  const lastDenySignatureRef = useRef<string | null>(null);
  const [showSweep, setShowSweep] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  /* G9-19: timer del tooltip — ref único, cleanup garantizado */
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => (
    () => {
      if (tooltipTimerRef.current !== null) {
        clearTimeout(tooltipTimerRef.current);
      }
    }
  ), []);

  /* ── §4.2 Telemetry (G9-20: dedupe por firma) ── */
  useEffect(() => {
    if (result.status === "denied") {
      const perms =
        gateOptions.permissions ||
        (gateOptions.permission ? [gateOptions.permission] : []);

      /* Firma estable: la misma denegación no re-emitte telemetría
         (rerenders, loading→denied, reason A→B→A) */
      const signature = [
        result.deniedReason ?? "",
        result.user?.role ?? "",
        perms.join(","),
        (gateOptions.roles ?? []).join(","),
      ].join("|");

      if (lastDenySignatureRef.current !== signature) {
        lastDenySignatureRef.current = signature;

        permissionEvents.emit("denied", {
          requiredRoles: gateOptions.roles,
          requiredPermissions: perms,
          userRole: result.user?.role,
          deniedReason: result.deniedReason,
          timestamp: Date.now(),
        });

        onDenied?.(result);
      }
    }

    /* Unlock sweep on denied → granted */
    if (
      result.status === "granted" &&
      prevStatusRef.current === "denied"
    ) {
      setShowSweep(true);
      const t = setTimeout(() => setShowSweep(false), UNLOCK_SWEEP_MS);

      permissionEvents.emit("granted", {
        requiredRoles: gateOptions.roles,
        userRole: result.user?.role,
        deniedReason: null,
        timestamp: Date.now(),
      });

      lastDenySignatureRef.current = null;
      prevStatusRef.current = result.status;
      return () => clearTimeout(t);
    }

    prevStatusRef.current = result.status;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.status, result.deniedReason]);

  /* ── §4.3 Read-only click interception (G9-18) ──
     CAPTURE + stopPropagation: el evento se cancela ANTES de
     descender a los handlers de los hijos — los controles
     prohibidos jamás ejecutan su acción. */
  const handleReadonlyIntercept = useCallback(
    (event: MouseEvent<HTMLDivElement>): void => {
      if (result.allowed) return;

      event.preventDefault();
      event.stopPropagation();

      setShowTooltip(true);
      if (tooltipTimerRef.current !== null) {
        clearTimeout(tooltipTimerRef.current);
      }
      tooltipTimerRef.current = setTimeout(
        () => setShowTooltip(false),
        READONLY_TOOLTIP_MS,
      );
    },
    [result.allowed],
  );

  /* ── §4.4 Loading state ── */
  if (result.status === "loading") {
    return null;
  }

  /* ═══════════════════════════════════════════
     §4.5 mode="dim" — children behind overlay
     ═══════════════════════════════════════════ */
  if (mode === "dim") {
    return (
      <div className="perm-dim" data-testid="perm-dim">
        <div
          className={cn(
            "perm-dim__children",
            !result.allowed && "perm-dim__children--blurred",
          )}
          aria-hidden={!result.allowed}
        >
          {children}
        </div>

        {!result.allowed && (
          <div className="perm-dim__overlay" data-testid="perm-dim-overlay">
            <div className="perm-dim__badge">
              <Lock size={20} className="perm-dim__badge-icon" aria-hidden="true" />
              <span className="perm-dim__badge-text">
                {degradedMessage || "Permisos requeridos"}
              </span>
            </div>
            {onRequestAccess && (
              <Button
                variant="unstyled"
                className="perm-dim__request-btn"
                onClick={onRequestAccess}
                type="button"
              >
                Solicitar acceso
              </Button>
            )}
          </div>
        )}

        {isDev && debug && (
          <DebugOverlay
            result={result}
            roles={gateOptions.roles}
            permissions={gateOptions.permissions}
            mode={mode}
          />
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     §4.6 mode="readonly" — bar + click intercept
     ═══════════════════════════════════════════ */
  if (mode === "readonly") {
    return (
      <div className="perm-ro" data-testid="perm-readonly">
        <div
          className={cn("perm-ro__bar", !result.allowed && "perm-ro__bar--visible")}
          data-testid="perm-ro-bar"
        >
          <Lock size={14} aria-hidden="true" />
          <span>
            Solo lectura
            {degradedMessage
              ? ` — ${degradedMessage}`
              : " — permisos de edición requeridos"}
          </span>
        </div>

        <div
          className={cn(
            "perm-ro__content",
            !result.allowed && "perm-ro__content--intercepted",
          )}
          onClickCapture={result.allowed ? undefined : handleReadonlyIntercept}
        >
          {children}
        </div>

        {/* Tooltip */}
        <div
          className={cn("perm-ro__tooltip", showTooltip && "perm-ro__tooltip--visible")}
          role="status"
          aria-live="polite"
        >
          Solo lectura
        </div>

        {isDev && debug && (
          <DebugOverlay
            result={result}
            roles={gateOptions.roles}
            permissions={gateOptions.permissions}
            mode={mode}
          />
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     §4.7 mode="hide" (default) — swap children
     ═══════════════════════════════════════════ */
  return (
    <>
      {result.allowed ? (
        <div
          className={cn(
            "perm-hide",
            showSweep && !prefersReducedMotion && "perm-hide--sweep",
          )}
          data-testid="perm-granted"
        >
          {children}
        </div>
      ) : (
        <div className="perm-hide perm-hide--denied" data-testid="perm-denied">
          {fallback || (
            <PermissionDenied
              roles={gateOptions.roles}
              permission={gateOptions.permission}
              permissions={gateOptions.permissions}
              deniedReason={result.deniedReason}
              onRequestAccess={onRequestAccess}
            />
          )}
        </div>
      )}

      {isDev && debug && (
        <DebugOverlay
          result={result}
          roles={gateOptions.roles}
          permissions={gateOptions.permissions}
          mode={mode}
        />
      )}
    </>
  );
}

/* G9-20: re-export directo — sin import muerto ni eslint-disable.
   Consumers que envuelven children en PermissionGate pueden requerir
   el contexto directamente. */
export { PermissionProvider, usePermissionContext } from "@/shared/hooks/usePermissionContext";
