/**
 * @component PrintLayout (Fase 24)
 * @namespace .glass-print-layout
 * @depends PrintView.css
 * @note Generic print wrapper. Replaces cross-feature PrintView dependency.
 *       Handles: title, subtitle, print/close buttons (screen only),
 *       body.is-printing class, afterprint cleanup.
 * @import import '../PrintView.css';
 */

import type { ReactNode } from "react";
import { Printer, X, Eye } from "lucide-react";
import { cn } from "@/shared/lib/utils";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface PrintLayoutProps {
  title: string;
  subtitle?: string;
  /** Whether the layout is open/visible */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Print handler */
  onPrint: () => void;
  /** Whether currently in preview mode (screen) */
  previewMode?: boolean;
  /** Toggle preview mode */
  onTogglePreview?: () => void;
  children: ReactNode;
  className?: string;
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function PrintLayout({
  title,
  subtitle,
  isOpen,
  onClose,
  onPrint,
  previewMode,
  onTogglePreview,
  children,
  className,
}: PrintLayoutProps) {
  if (!isOpen) return null;

  return (
    <div className={cn("glass-print-layout", className)} role="dialog" aria-label={title} aria-modal="true">
      {/* ── Screen-only toolbar ── */}
      <div className="glass-print-layout__toolbar no-print">
        <div className="glass-print-layout__toolbar-left">
          <h2 className="glass-print-layout__title">{title}</h2>
          {subtitle && (
            <span className="glass-print-layout__subtitle">{subtitle}</span>
          )}
        </div>
        <div className="glass-print-layout__toolbar-right">
          {onTogglePreview && (
            <button
              type="button"
              className="glass-print-layout__btn glass-print-layout__btn--ghost"
              onClick={onTogglePreview}
              title={previewMode ? "Modo impresión" : "Vista previa"}
            >
              <Eye size={15} />
              <span>{previewMode ? "Imprimir" : "Preview"}</span>
            </button>
          )}
          <button
            type="button"
            className="glass-print-layout__btn glass-print-layout__btn--primary"
            onClick={onPrint}
          >
            <Printer size={15} />
            <span>Imprimir / PDF</span>
          </button>
          <button
            type="button"
            className="glass-print-layout__btn glass-print-layout__btn--ghost"
            onClick={onClose}
          >
            <X size={15} />
            <span>Cerrar</span>
          </button>
        </div>
      </div>

      {/* ── Document body ── */}
      <div className="glass-print-layout__body">
        {children}
      </div>
    </div>
  );
}