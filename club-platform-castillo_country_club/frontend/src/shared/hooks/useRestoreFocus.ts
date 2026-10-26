// src/shared/hooks/useRestoreFocus.ts
// ═══════════════════════════════════════════════════════════
// Restore Focus — Return focus to trigger element on close
//
// WCAG 2.1: When a modal/dialog closes, focus must return
// to the element that triggered it.
//
// Usage:
//   const triggerRef = useRef<HTMLButtonElement>(null);
//   useRestoreFocus(isOpen, triggerRef);
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef, type RefObject } from "react";

export function useRestoreFocus(
  isOpen: boolean,
  triggerRef: RefObject<HTMLElement | null>,
) {
  const wasOpenRef = useRef(isOpen);

  useEffect(() => {
    // Detect transition: open → closed
    if (wasOpenRef.current && !isOpen) {
      // Restore focus to trigger element
      requestAnimationFrame(() => {
        const el = triggerRef.current;
        if (el && typeof el.focus === "function") {
          el.focus();
        }
      });
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, triggerRef]);
}
