/**
 * @hook usePrintView (Fase 25)
 * @module features/dashboard/hooks
 * @note Print preview state, print handler, keyboard shortcuts,
 *       body scroll lock, Ctrl+P interception, focus trap.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";

/* ═══════════════════════════════════════
   Hook
   ═══════════════════════════════════════ */

export function usePrintView() {
  const [previewMode, setPreviewMode] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  /* ── Memoized date ── */
  const formattedDate = useMemo(
    () =>
      new Date().toLocaleDateString("es-CR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  const printedAt = useMemo(
    () =>
      new Date().toLocaleString("es-CR", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  );

  /* ── Actions ── */
  const openPreview = useCallback(() => setPreviewMode(true), []);
  const closePreview = useCallback(() => setPreviewMode(false), []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  /* ── Keyboard: Esc + Ctrl+P ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      /* Ctrl+P interception */
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        if (previewMode) {
          window.print();
        } else {
          setPreviewMode(true);
        }
        return;
      }

      /* Esc: close preview */
      if (e.key === "Escape" && previewMode) {
        e.preventDefault();
        setPreviewMode(false);
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [previewMode]);

  /* ── Body scroll lock ── */
  useEffect(() => {
    if (previewMode) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [previewMode]);

  /* ── Focus trap ── */
  useEffect(() => {
    if (!previewMode || !overlayRef.current) return;

    /* Small delay to let the overlay render */
    const timer = setTimeout(() => {
      const firstFocusable = overlayRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    }, 50);

    return () => clearTimeout(timer);
  }, [previewMode]);

  return {
    previewMode,
    openPreview,
    closePreview,
    handlePrint,
    formattedDate,
    printedAt,
    overlayRef,
  };
}