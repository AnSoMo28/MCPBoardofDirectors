/**
 * @component PrintToolbar (Fase 25)
 * @namespace .glass-print__toolbar
 * @depends PrintView.css
 * @note Sticky toolbar for print preview overlay.
 * @import import '../PrintView.css';
 */

import { Printer, X } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface PrintToolbarProps {
  onPrint: () => void;
  onClose: () => void;
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function PrintToolbar({
  onPrint,
  onClose,
}: PrintToolbarProps) {
  return (
    <div className="glass-print__toolbar">
      <div className="glass-print__toolbar-left">
        <span className="glass-print__toolbar-icon">
          <Printer size={18} />
        </span>
        <span className="glass-print__toolbar-label">
          Vista Previa de Impresión — Formato A4
        </span>
      </div>
      <div className="glass-print__toolbar-actions">
        <Button
          variant="primary"
          size="sm"
          icon={<Printer size={14} />}
          onClick={onPrint}
        >
          Imprimir ahora
        </Button>
        <button
          type="button"
          onClick={onClose}
          className="glass-print__toolbar-close"
          aria-label="Cerrar vista previa"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}