/**
 * Modal.tsx
 * src/shared/components/ui/Modal.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @namespace   .ui-modal
 * @keyframes   2 (ui-modal-overlay-in, ui-modal-panel-in) — in Modal.css
 * @depends     globals.css §1 tokens, createFocusTrap, lucide-react (X)
 *
 * PRE-WRITE VERIFICATION:
 * [x] cn utility verified in shared/lib/utils
 * [x] createFocusTrap verified in shared/lib/focusTrap
 * [x] X icon verified in lucide-react
 * [x] All tokens verified against globals.css §1
 * [x] radius-xl (16px) verified — radius-2xl does NOT exist
 *
 * ANTI-PATTERNS REMOVED:
 * [x] Tailwind utilities → BEM CSS classes (.ui-modal__*)
 * [x] font-[family-name:var(--font-display)] → CSS font-family
 * [x] font-[family-name:var(--font-body)] → removed (token deleted)
 * [x] animate-[fadeIn/scaleIn] → namespaced ui-modal-* keyframes
 * [x] glass-card on modal panel → glass-panel primitive
 * [x] rounded-[var(--radius-2xl)] → var(--radius-xl)
 * [x] border-white/[0.06] → CSS rgba
 * [x] Instant unmount → CSS exit animation lifecycle
 * [x] Missing data-testid → added
 * [x] Missing light mode → added in CSS
 * [x] Missing reduced motion → added in CSS
 * [x] Mutable props → readonly
 */

// ═══ React core ═══
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";

// ═══ Third-party ═══
import { X } from "lucide-react";

// ═══ Shared — values ═══
import { cn } from "@/shared/lib/utils";
import { createFocusTrap } from "@/shared/lib/focusTrap";
import "./Modal.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   ═══════════════════════════════════════════════════════════════ */

export interface ModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly size?: "sm" | "md" | "lg";
  readonly footer?: ReactNode;
}


/* ═══════════════════════════════════════════════════════════════
   §2  COMPONENT — Modal
   CSS-only entrance/exit animation lifecycle.
   Focus trap + scroll lock + escape key.
   Sticky glass header + footer.
   ═══════════════════════════════════════════════════════════════ */

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  footer,
}: ModalProps) {

  /* ─── §2.1  Refs ─────────────────────────────────────────── */

  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);


  /* ─── §2.2  State ────────────────────────────────────────── */

  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);


  /* ─── §2.3  Effects — Open/Close lifecycle ───────────────── */

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      // ── Opening ──
      wasOpenRef.current = true;
      setShouldRender(true);
      // Double rAF to ensure DOM paint before triggering CSS transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else if (!isOpen && wasOpenRef.current) {
      // ── Closing ──
      wasOpenRef.current = false;
      setIsVisible(false);
      // Wait for exit animation before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);


  /* ─── §2.4  Effects — Scroll lock ───────────────────────── */

  useEffect(() => {
    if (shouldRender) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [shouldRender]);


  /* ─── §2.5  Effects — Escape key ─────────────────────────── */

  useEffect(() => {
    if (!isVisible) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isVisible, onClose]);


  /* ─── §2.6  Effects — Focus trap ─────────────────────────── */

  useEffect(() => {
    if (!isVisible || !panelRef.current) return;
    const release = createFocusTrap(panelRef.current);
    return release;
  }, [isVisible]);


  /* ─── §2.7  Handlers ─────────────────────────────────────── */

  const handleOverlayClick = useCallback(() => {
    onClose();
  }, [onClose]);


  /* ─── §2.8  Render ───────────────────────────────────────── */

  if (!shouldRender) return null;

  return (
    <div
      data-testid="ui-modal"
      className={cn(
        "ui-modal__overlay",
        isVisible && "ui-modal__overlay--visible",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="ui-modal__backdrop"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "ui-modal__panel",
          `ui-modal__panel--${size}`,
          isVisible && "ui-modal__panel--visible",
        )}
      >
        {/* Header — sticky glass */}
        <div className="ui-modal__header">
          <div className="ui-modal__header-text">
            <h2 className="ui-modal__title">{title}</h2>
            {description && (
              <p className="ui-modal__description">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-modal__close"
            aria-label="Cerrar"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="ui-modal__body">
          {children}
        </div>

        {/* Footer — sticky glass */}
        {footer && (
          <div className="ui-modal__footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}