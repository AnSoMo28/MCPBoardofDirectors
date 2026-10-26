/**
 * StaleDataBanner.tsx
 * src/shared/components/ui/StaleDataBanner.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @namespace   .ui-stale-banner
 * @keyframes   1 (ui-stale-banner-spin) — in StaleDataBanner.css
 * @depends     globals.css §1 tokens, Button.tsx, lucide-react (RefreshCw, Clock),
 *              BC-02 (providers.tsx v1.1 — QueryCache/MutationCache onError)
 *
 * PRE-WRITE VERIFICATION:
 * [x] cn utility verified in shared/lib/utils
 * [x] Button verified in shared/components/ui
 * [x] RefreshCw, Clock verified in lucide-react
 * [x] All tokens verified against globals.css §1
 * [x] --color-amber-400, --color-amber-500 verified
 *
 * ANTI-PATTERNS REMOVED:
 * [x] framer-motion (motion.div) → CSS transition lifecycle (0KB)
 * [x] Tailwind (w-3.5 h-3.5, animate-spin) → BEM CSS
 * [x] ease: [0.25,0.1,0.25,1] → Apple cubic-bezier(0.32, 0.72, 0, 1)
 * [x] glass-stale-banner namespace → ui-stale-banner
 * [x] Missing data-testid → added
 * [x] Missing aria-hidden on Clock → added
 * [x] Missing reduced motion → CSS
 * [x] Missing print → CSS
 * [x] Missing responsive → CSS
 * [x] Mutable props → readonly
 *
 * FIXES v2.1 — Auditoría G9 (Paquete 1 · REQUEST 1 §13 #3):
 * [x] G9-06 (P2) Estado muerto `shouldRender` (declarado, jamás leído) eliminado.
 * [x] G9-07 (P2) `setTimeout(1500)` hardcodeado sin cleanup ni vínculo real con
 *     el refetch (feedback ficticio + setState post-unmount). AHORA: onRefresh
 *     acepta void | Promise<void>, se AWAITA de verdad, con tope de seguridad
 *     8s, gracia de 350ms para que el spin sea perceptible y cleanup en unmount.
 * [x] G9-08 (P2) Import desde el barrel `@/shared/components/ui` DENTRO del
 *     propio paquete ui → auto-ciclo index→StaleDataBanner→index. AHORA import
 *     directo de hermano `./Button` (convención PermissionGate/PermissionDenied).
 * [x] G9-09 (P3) Copy `hace ?.` → fallbacks explícitos con/sin age.
 */

// ═══ React core ═══
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// ═══ Third-party ═══
import { RefreshCw, Clock } from "lucide-react";

// ═══ Shared — components (G9-08: hermano directo, NO barrel) ═══
import { Button } from "./Button";

// ═══ Shared — values ═══
import { cn } from "@/shared/lib/utils";
import "./StaleDataBanner.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   ═══════════════════════════════════════════════════════════════ */

export interface StaleDataBannerProps {
  readonly age?: string;
  /** G9-07: el consumidor puede devolver una promesa (refetch real). */
  readonly onRefresh?: () => void | Promise<void>;
  readonly message?: string;
}


/* ═══════════════════════════════════════════════════════════════
   §2  CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

/** Tope de seguridad: nunca más de 8s en "Actualizando…". */
const REFRESH_SAFETY_MS = 8_000;

/** Gracia mínima para que el spin de éxito sea perceptible. */
const REFRESH_GRACE_MS = 350;


/* ═══════════════════════════════════════════════════════════════
   §3  COMPONENT — StaleDataBanner
   Amber warning banner for stale data. Slide-in entrance.
   Refresh button with spinning icon feedback.
   CSS-only lifecycle (no framer-motion).
   ═══════════════════════════════════════════════════════════════ */

export function StaleDataBanner({
  age,
  onRefresh,
  message,
}: StaleDataBannerProps) {

  /* ─── §3.1  State ────────────────────────────────────────── */

  const [refreshing, setRefreshing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  /* G9-07: timers trackeados — cleanup garantizado */
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  /* ─── §3.2  Effects — entrance + cleanup ──────────────────── */

  useEffect(() => {
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => setIsVisible(true));
    });
    return () => {
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
    };
  }, []);

  useEffect(() => (
    () => {
      if (safetyTimerRef.current !== null) clearTimeout(safetyTimerRef.current);
      if (graceTimerRef.current !== null) clearTimeout(graceTimerRef.current);
    }
  ), []);


  /* ─── §3.3  Handlers ─────────────────────────────────────── */

  const handleRefresh = useCallback(async (): Promise<void> => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);

    /* Tope de seguridad: una promesa colgada no congela el banner */
    safetyTimerRef.current = setTimeout(
      () => setRefreshing(false),
      REFRESH_SAFETY_MS,
    );

    try {
      await onRefresh();
    } catch {
      /* G9-07: el error de refetch ya lo notifica la capa global
         (BC-02 · providers.tsx v1.1 MutationCache.onError) */
    } finally {
      if (safetyTimerRef.current !== null) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
      graceTimerRef.current = setTimeout(
        () => setRefreshing(false),
        REFRESH_GRACE_MS,
      );
    }
  }, [onRefresh, refreshing]);


  /* ─── §3.4  Render ───────────────────────────────────────── */

  return (
    <div
      data-testid="ui-stale-banner"
      className={cn(
        "ui-stale-banner",
        isVisible && "ui-stale-banner--visible",
        refreshing && "ui-stale-banner--refreshing",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="ui-stale-banner__content">
        <Clock size={14} className="ui-stale-banner__icon" aria-hidden="true" />
        <p className="ui-stale-banner__text">
          {/* G9-09: fallbacks explícitos — jamás "hace ?." */}
          {message ??
            (age
              ? `Datos actualizados hace ${age}. Es posible que estén desactualizados.`
              : "Datos sin marca de tiempo reciente. Es posible que estén desactualizados.")}
        </p>
      </div>

      {onRefresh && (
        <Button
          variant="ghost"
          onClick={handleRefresh}
          disabled={refreshing}
          icon={
            <RefreshCw
              className={cn(
                "ui-stale-banner__refresh-icon",
                refreshing && "ui-stale-banner__refresh-icon--spinning",
              )}
            />
          }
          className="ui-stale-banner__btn"
        >
          {refreshing ? "Actualizando..." : "Actualizar"}
        </Button>
      )}
    </div>
  );
}
