/**
 * @component ExportButton (Fase 24 — REWRITE)
 * @namespace .glass-export
 * @depends useExportDropdown, ExportButton.css
 * @note Glass dropdown with animated options, progress feedback per format,
 *       keyboard navigation (↑↓ Enter Escape Home End type-ahead),
 *       export history, reduced motion support.
 *       Backward-compatible: same props interface, default + named export.
 * @import import './ExportButton.css';
 */

import { AnimatePresence, motion } from "framer-motion";
import { FileDown, ChevronDown, Check, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useExportDropdown } from "@/shared/hooks/useExportDropdown";
import type { NarrativeExportData } from "@/shared/services/exportService";
import "./ExportButton.css";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface ExportButtonProps {
  /** Module identifier for filename generation */
  module: string;
  /** Data for client-side text/CSV export */
  data?: NarrativeExportData;
  /** Callback when "Imprimir / PDF" is selected */
  onPrint?: () => void;
  /** Callback when "Documento de Decisión" is selected */
  onDecisionDocument?: () => void;
  /** Button variant */
  variant?: "primary" | "secondary" | "ghost";
  /** Additional class names */
  className?: string;
}

/* ═══════════════════════════════════════
   Helpers
   ═══════════════════════════════════════ */

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ═══════════════════════════════════════
   Motion Variants
   ═══════════════════════════════════════ */

const NORMAL_MENU = {
  hidden: { opacity: 0, y: -8, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1] as const,
      staggerChildren: 0.03,
      delayChildren: 0.04,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.97,
    transition: { duration: 0.15 },
  },
};

const NORMAL_OPTION = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.15 },
  },
};

const REDUCED_MENU = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

const REDUCED_OPTION = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const ICON_TRANSITION = {
  initial: { opacity: 0, scale: 0.6 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.6 },
  transition: { duration: 0.15 },
};

const REDUCED_ICON_TRANSITION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.1 },
};

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function ExportButton({
  module,
  data,
  onPrint,
  onDecisionDocument,
  variant = "secondary",
  className,
}: ExportButtonProps) {
  const dropdown = useExportDropdown({
    module,
    data,
    onPrint,
    onDecisionDocument,
  });

  const prefersReducedMotion = useReducedMotion();

  /* ── Motion config ── */
  const menuVariants = prefersReducedMotion ? REDUCED_MENU : NORMAL_MENU;
  const optionVariants = prefersReducedMotion ? REDUCED_OPTION : NORMAL_OPTION;
  const iconTransition = prefersReducedMotion
    ? REDUCED_ICON_TRANSITION
    : ICON_TRANSITION;

  /* ── Empty guard ── */
  if (dropdown.availableOptions.length === 0) return null;

  /* ── Trigger icon (animated state transitions) ── */
  const triggerIcon = (
    <AnimatePresence mode="wait">
      {dropdown.isExporting ? (
        <motion.span key="spin" {...iconTransition}>
          <Loader2 size={16} className="glass-export__spin" />
        </motion.span>
      ) : dropdown.progress.state === "done" ? (
        <motion.span key="check" {...iconTransition}>
          <Check size={16} className="glass-export__check" />
        </motion.span>
      ) : (
        <motion.span key="default" {...iconTransition}>
          <FileDown size={16} />
        </motion.span>
      )}
    </AnimatePresence>
  );

  /* ── Trigger label ── */
  const triggerLabel =
    dropdown.progress.state === "done" && dropdown.progress.format === "text"
      ? "Copiado"
      : "Exportar";

  return (
    <div
      ref={dropdown.containerRef}
      className={cn("glass-export", className)}
    >
      {/* ── Trigger ── */}
      <button
        type="button"
        className={cn("glass-export__trigger", `glass-export__trigger--${variant}`)}
        onClick={dropdown.toggle}
        onKeyDown={dropdown.handleTriggerKeyDown}
        aria-expanded={dropdown.isOpen}
        aria-haspopup="menu"
        aria-label="Exportar datos"
      >
        <span className="glass-export__trigger-icon">{triggerIcon}</span>
        <span className="glass-export__trigger-label">{triggerLabel}</span>
        <ChevronDown
          size={13}
          className={cn(
            "glass-export__chevron",
            dropdown.isOpen && "glass-export__chevron--open",
          )}
        />
      </button>

      {/* ── Dropdown Menu ── */}
      <AnimatePresence>
        {dropdown.isOpen && (
          <motion.div
            className="glass-export__menu"
            role="menu"
            aria-label="Opciones de exportación"
            onKeyDown={dropdown.handleMenuKeyDown}
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {dropdown.availableOptions.map((opt, i) => {
              const Icon = opt.icon;
              const isFocus = i === dropdown.activeIndex;
              const isDone =
                dropdown.progress.state === "done" &&
                dropdown.progress.format === opt.id;

              return (
                <motion.button
                  key={opt.id}
                  ref={(el) => dropdown.setOptionRef(i, el)}
                  type="button"
                  role="menuitem"
                  tabIndex={isFocus ? 0 : -1}
                  onClick={() => dropdown.handleOption(opt.id)}
                  onMouseEnter={() => dropdown.setActiveIndex(i)}
                  className={cn(
                    "glass-export__option",
                    opt.isAI && "glass-export__option--ai",
                    isFocus && "glass-export__option--focus",
                    isDone && "glass-export__option--done",
                  )}
                  variants={optionVariants}
                >
                  <span className="glass-export__option-icon">
                    {isDone ? (
                      <Check size={16} className="glass-export__check" />
                    ) : (
                      <Icon size={16} />
                    )}
                  </span>
                  <div className="glass-export__option-info">
                    <p className="glass-export__option-label">{opt.label}</p>
                    <p className="glass-export__option-desc">
                      {opt.description}
                    </p>
                  </div>
                  {opt.isAI && (
                    <span className="glass-export__badge">AI</span>
                  )}
                </motion.button>
              );
            })}

            {/* ── History ── */}
            {dropdown.lastExport && (
              <div className="glass-export__history" role="presentation">
                <span className="glass-export__history-dot" />
                <span className="glass-export__history-text">
                  Último:{" "}
                  {dropdown.lastExport.format.toUpperCase()}{" "}
                  → {capitalizeFirst(dropdown.lastExport.module)},{" "}
                  {dropdown.getTimeAgo(dropdown.lastExport.timestamp)}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Progress bar (csv / excel) ── */}
      {dropdown.isExporting &&
        (dropdown.progress.format === "csv" ||
          dropdown.progress.format === "excel") && (
          <div className="glass-export__progress" aria-hidden="true" />
        )}
    </div>
  );
}

export default ExportButton;