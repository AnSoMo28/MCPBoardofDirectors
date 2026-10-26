/**
 * @component PrintView (Fase 25 — REWRITE)
 * @namespace .glass-print
 * @depends usePrintView, PrintToolbar, PrintPage, PrintView.css
 * @note Print preview + print handler. CSS transition replaces
 *       framer-motion overlay. Ctrl+P intercepted. Focus trap.
 *       Backward-compatible: same default export, same props.
 * @import import '../PrintView.css';
 */

import type { ReactNode } from "react";
import { Eye, Printer } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { usePrintView } from "../hooks/usePrintView";
import { PrintToolbar } from "./PrintToolbar";
import { PrintPage } from "./PrintPage";
import { cn } from "@/shared/lib/utils";
import "../PrintView.css";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface PrintViewProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  printDate?: string;
  className?: string;
  hideTrigger?: boolean;
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export default function PrintView({
  children,
  title,
  subtitle,
  printDate,
  className,
  hideTrigger = false,
}: PrintViewProps) {
  const h = usePrintView();
  const displayDate = printDate ?? h.formattedDate;

  return (
    <>
      {/* ── Trigger buttons ── */}
      {!hideTrigger && (
        <div className="glass-print">
          <Button
            variant="secondary"
            size="sm"
            icon={<Eye size={14} />}
            onClick={h.openPreview}
          >
            Vista previa
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Printer size={14} />}
            onClick={h.handlePrint}
          >
            Imprimir
          </Button>
        </div>
      )}

      {/* ── Print preview overlay (CSS transition) ── */}
      <div
        ref={h.overlayRef}
        className={cn(
          "glass-print__overlay",
          h.previewMode && "glass-print__overlay--visible",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Vista previa de impresión"
        onClick={(e) => {
          if (e.target === h.overlayRef.current)
            h.closePreview();
        }}
      >
        {h.previewMode && (
          <>
            {/* Toolbar */}
            <PrintToolbar
              onPrint={h.handlePrint}
              onClose={h.closePreview}
            />

            {/* A4 page */}
            <div className="glass-print__page-wrapper">
              <PrintPage
                title={title}
                subtitle={subtitle}
                formattedDate={displayDate}
                printedAt={h.printedAt}
                className={className}
              >
                {children}
              </PrintPage>
            </div>
          </>
        )}
      </div>
    </>
  );
}