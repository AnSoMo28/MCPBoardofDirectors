/**
 * @component HitlQueue (Fase 25 — REWRITE)
 * @namespace .glass-hitl
 * @depends useHitlQueue, HitlCard, HitlQueue.css, config/hitl
 * @note HITL approval queue with AI decision context, smart reject
 *       confirmation, decision feedback, batch selection, keyboard nav.
 *       Backward-compatible: same props interface, same exports.
 * @import import '../HitlQueue.css';
 */

import { ShieldCheck } from "lucide-react";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { useHitlQueue } from "../hooks/useHitlQueue";
import { HitlCard } from "./HitlCard";
import type { HitlItem } from "../config/hitl";
import "../HitlQueue.css";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface HitlQueueProps {
  items: HitlItem[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing?: string | null;
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function HitlQueue({
  items,
  onApprove,
  onReject,
  isProcessing,
}: HitlQueueProps) {
  const h = useHitlQueue(items, onApprove, onReject);
  const showBatch = items.length >= 3;

  return (
    <div
      className="glass-hitl"
      onKeyDown={h.handleKeyDown}
      role="region"
      aria-label="Cola de aprobaciones"
    >
      {/* ═══ Header ═══ */}
      <div className="glass-hitl__header">
        <div className="flex items-center gap-2">
          <ShieldCheck
            size={20}
            strokeWidth={1.5}
            className="glass-hitl__header-icon"
          />
          <h3 className="glass-hitl__header-title">
            Aprobaciones pendientes
          </h3>
        </div>
        {items.length > 0 && (
          <span className="glass-hitl__header-count">
            {items.length} pendiente
            {items.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ═══ Batch Toolbar ═══ */}
      {showBatch && (
        <div className="glass-hitl__batch-toolbar">
          <button
            type="button"
            onClick={h.selectAll}
            className="glass-hitl__batch-btn"
          >
            Seleccionar todo
          </button>
          {h.selectedIds.size > 0 && (
            <>
              <button
                type="button"
                onClick={h.clearSelection}
                className="glass-hitl__batch-btn"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={h.batchApprove}
                className="glass-hitl__batch-btn glass-hitl__batch-btn--primary"
              >
                Aprobar seleccionados ({h.selectedIds.size})
              </button>
            </>
          )}
        </div>
      )}

      {/* ═══ List or Empty ═══ */}
      {items.length === 0 ? (
        <div className="glass-hitl__empty">
          <EmptyState
            icon={<ShieldCheck size={40} strokeWidth={1} />}
            title="Sin aprobaciones pendientes"
            description="No hay solicitudes que requieran tu aprobación en este momento."
          />
        </div>
      ) : (
        <div
          className="glass-hitl__list"
          role="list"
          aria-label="Aprobaciones pendientes"
        >
          {items.map((item, index) => (
            <HitlCard
              key={item.id}
              item={item}
              index={index}
              isFocused={h.focusedIndex === index}
              isConfirmingReject={
                h.confirmRejectId === item.id
              }
              feedbackState={
                h.completedItems[item.id] || null
              }
              isProcessing={isProcessing === item.id}
              isSelected={h.selectedIds.has(item.id)}
              showCheckbox={showBatch}
              onApprove={() => h.handleApprove(item.id)}
              onReject={() => h.startReject(item.id)}
              onToggleSelect={() =>
                h.toggleSelect(item.id)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* Re-export type for backward compatibility */
export type { HitlItem } from "../config/hitl";