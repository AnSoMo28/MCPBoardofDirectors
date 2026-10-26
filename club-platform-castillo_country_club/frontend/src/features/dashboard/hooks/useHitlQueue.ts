/**
 * @hook useHitlQueue (Fase 25)
 * @module features/dashboard/hooks
 * @note Full state management for HITL approval queue:
 *       - Reject confirmation with proper timeout cleanup (no memory leak)
 *       - Decision feedback (approve/reject glow) with delayed parent callback
 *       - Keyboard navigation (↑↓ A R Esc)
 *       - Batch selection with select all / clear / batch approve
 *       - Auto-cleanup of stale completed items and selections
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { HitlItem } from "../config/hitl";
import { HITL_TIMING } from "../config/hitl";

/* ═══════════════════════════════════════
   Hook
   ═══════════════════════════════════════ */

export function useHitlQueue(
  items: HitlItem[],
  onApprove: (id: string) => void,
  onReject: (id: string) => void,
) {
  /* ── State ── */
  const [confirmRejectId, setConfirmRejectId] =
    useState<string | null>(null);
  const [completedItems, setCompletedItems] = useState<
    Record<string, "approved" | "rejected">
  >({});
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(),
  );

  /* ── Refs for timeout cleanup ── */
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimeoutsRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});

  /* ── Cleanup ALL timeouts on unmount ── */
  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current)
        clearTimeout(confirmTimeoutRef.current);
      Object.values(feedbackTimeoutsRef.current).forEach(
        clearTimeout,
      );
    };
  }, []);

  /* ── Clean stale completed items + selections when items change ── */
  useEffect(() => {
    const activeIds = new Set(items.map((i) => i.id));

    setCompletedItems((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of Object.keys(next)) {
        if (!activeIds.has(id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    setSelectedIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of next) {
        if (!activeIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [items]);

  /* ── Clamp focused index when items shrink ── */
  useEffect(() => {
    setFocusedIndex((prev) =>
      Math.min(prev, Math.max(0, items.length - 1)),
    );
  }, [items.length]);

  /* ═══════════════════════════════════════
     Approve
     ═══════════════════════════════════════ */

  const handleApprove = useCallback(
    (id: string) => {
      if (completedItems[id]) return;
      setCompletedItems((prev) => ({
        ...prev,
        [id]: "approved",
      }));
      feedbackTimeoutsRef.current[id] = setTimeout(() => {
        onApprove(id);
        delete feedbackTimeoutsRef.current[id];
      }, HITL_TIMING.decisionFeedbackMs);
    },
    [completedItems, onApprove],
  );

  /* ═══════════════════════════════════════
     Reject (two-step confirmation)
     ═══════════════════════════════════════ */

  const startReject = useCallback(
    (id: string) => {
      if (completedItems[id]) return;

      if (confirmRejectId === id) {
        /* ── Second click: execute rejection ── */
        setCompletedItems((prev) => ({
          ...prev,
          [id]: "rejected",
        }));
        setConfirmRejectId(null);
        if (confirmTimeoutRef.current) {
          clearTimeout(confirmTimeoutRef.current);
          confirmTimeoutRef.current = null;
        }
        feedbackTimeoutsRef.current[id] = setTimeout(() => {
          onReject(id);
          delete feedbackTimeoutsRef.current[id];
        }, HITL_TIMING.decisionFeedbackMs);
      } else {
        /* ── First click: start confirmation ── */
        setConfirmRejectId(id);
        if (confirmTimeoutRef.current)
          clearTimeout(confirmTimeoutRef.current);
        confirmTimeoutRef.current = setTimeout(() => {
          setConfirmRejectId(null);
          confirmTimeoutRef.current = null;
        }, HITL_TIMING.rejectConfirmMs);
      }
    },
    [confirmRejectId, completedItems, onReject],
  );

  const cancelReject = useCallback(() => {
    setConfirmRejectId(null);
    if (confirmTimeoutRef.current) {
      clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = null;
    }
  }, []);

  /* ═══════════════════════════════════════
     Keyboard Navigation
     ═══════════════════════════════════════ */

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "BUTTON" ||
        target.tagName === "INPUT" ||
        target.tagName === "A" ||
        target.isContentEditable
      )
        return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) =>
            Math.min(prev + 1, items.length - 1),
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "a":
        case "A":
          if (!e.metaKey && !e.ctrlKey && !e.altKey) {
            const item = items[focusedIndex];
            if (item && !completedItems[item.id])
              handleApprove(item.id);
          }
          break;
        case "r":
        case "R":
          if (!e.metaKey && !e.ctrlKey && !e.altKey) {
            const item = items[focusedIndex];
            if (item && !completedItems[item.id])
              startReject(item.id);
          }
          break;
        case "Escape":
          cancelReject();
          break;
      }
    },
    [
      items,
      focusedIndex,
      completedItems,
      handleApprove,
      startReject,
      cancelReject,
    ],
  );

  /* ═══════════════════════════════════════
     Batch Selection
     ═══════════════════════════════════════ */

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(
      new Set(
        items
          .filter((i) => !completedItems[i.id])
          .map((i) => i.id),
      ),
    );
  }, [items, completedItems]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const batchApprove = useCallback(() => {
    selectedIds.forEach((id) => {
      if (!completedItems[id]) handleApprove(id);
    });
    setSelectedIds(new Set());
  }, [selectedIds, completedItems, handleApprove]);

  /* ═══════════════════════════════════════
     Return
     ═══════════════════════════════════════ */

  return {
    /* Confirmation */
    confirmRejectId,
    /* Decision feedback */
    completedItems,
    /* Keyboard */
    focusedIndex,
    /* Batch */
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    batchApprove,
    /* Actions */
    handleApprove,
    startReject,
    cancelReject,
    handleKeyDown,
  };
}