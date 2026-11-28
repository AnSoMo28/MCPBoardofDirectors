// src/features/dashboard/components/QuickActions.tsx
// ═══════════════════════════════════════════════════════════
// Quick Actions FAB — Castillo Country Club
//
// Premium enhancements:
// + FAB pulse ring (discoverability invitation)
// + Overlay → glass-modal-overlay (consistency)
// + Action buttons → useRipple (click feedback)
// + FAB inline styles → CSS class
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useRipple } from "@/shared/hooks/useRipple";
import { motion, AnimatePresence } from "framer-motion";
import './QuickActions.css';
import {
  Plus, X, CalendarPlus, UserPlus, Megaphone,
  FileBarChart, AlertCircle, type LucideIcon,
} from "lucide-react";

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  onClick: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  const prefersReduced = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const overlayM = prefersReduced
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } };

  const actionM = (index: number) =>
    prefersReduced
      ? {}
      : {
          initial: { opacity: 0, y: 20, scale: 0.8 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: 10, scale: 0.8 },
          transition: { type: "spring" as const, bounce: 0.25, duration: 0.4, delay: (actions.length - 1 - index) * 0.05 },
        };

  return (
    <>
      {/* Overlay — glass-modal-overlay for consistency */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            {...overlayM}
            className="quick-actions glass-modal-overlay fixed inset-0 z-40"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <div ref={containerRef} className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-2 sm:gap-3">
        <AnimatePresence>
          {isOpen &&
            actions.map((action, index) => (
              <QuickActionButton
                key={action.id}
                action={action}
                motionProps={actionM(index)}
                onClick={() => { action.onClick(); setIsOpen(false); }}
              />
            ))}
        </AnimatePresence>

        {/* FAB — with pulse ring when closed */}
        <motion.button
          onClick={toggle}
          whileTap={prefersReduced ? undefined : { scale: 0.9 }}
          animate={prefersReduced ? undefined : { rotate: isOpen ? 45 : 0 }}
          transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
          className={cn(
            "aurora-btn aurora-btn--gold",
            "relative w-14 h-14 rounded-full flex items-center justify-center",
            "text-[var(--color-abyss)]",
            "hover:brightness-110 transition-all duration-200",
            "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)] focus-visible:outline-offset-2",
            "quick-actions-fab",
          )}
          aria-label={isOpen ? "Cerrar acciones rápidas" : "Acciones rápidas"}
          aria-expanded={isOpen}
        >
          {/* Pulse ring — visible when closed, inviting click */}
          {!isOpen && !prefersReduced && (
            <span className="quick-actions-fab__pulse-ring" aria-hidden="true" />
          )}
          {isOpen ? (
            <X size={24} strokeWidth={1.5} className="relative z-10" />
          ) : (
            <Plus size={24} strokeWidth={1.5} className="relative z-10" />
          )}
        </motion.button>
      </div>
    </>
  );
}

/* ── Sub-component: action button with ripple ── */

function QuickActionButton({
  action,
  motionProps,
  onClick,
}: {
  action: QuickAction;
  motionProps: Record<string, unknown>;
  onClick: () => void;
}) {
  const rippleRef = useRipple<HTMLButtonElement>();
  const Icon = action.icon;

  return (
    <motion.button
      ref={rippleRef}
      {...motionProps}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 pr-4 pl-3 py-3 rounded-full",
        "shadow-[var(--shadow-elevated)] min-h-[48px]",
        "glass-card",
        "hover:scale-105 active:scale-95 transition-transform duration-150",
        "group focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)] focus-visible:outline-offset-2",
      )}
      aria-label={action.label}
    >
      <Icon
        size={20}
        strokeWidth={1.5}
        className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
        style={{ color: action.color }}
      />
      <span className="text-sm font-semibold text-[var(--color-silver-100)] font-[family-name:var(--font-ui)] whitespace-nowrap">
        {action.label}
      </span>
    </motion.button>
  );
}

/* ── Default actions by role ── */

export function getDefaultActions(role: string, navigate: (path: string) => void): QuickAction[] {
  const base: QuickAction[] = [
    {
      id: "new-event",
      label: "Nuevo evento",
      icon: CalendarPlus,
      color: "var(--color-terracotta-400)",
      onClick: () => navigate("/admin/events/new"),
    },
    {
      id: "new-family",
      label: "Nueva familia",
      icon: UserPlus,
      color: "var(--color-gold-400)",
      onClick: () => navigate("/admin/families/new"),
    },
    {
      id: "announcement",
      label: "Comunicado",
      icon: Megaphone,
      color: "var(--color-teal-400)",
      onClick: () => navigate("/admin/communications/new"),
    },
  ];
  if (role === "ADMIN" || role === "JUNTA") {
    base.push({
      id: "reports",
      label: "Ver reportes",
      icon: FileBarChart,
      color: "var(--color-emerald-400)",
      onClick: () => navigate("/admin/reports"),
    });
  }
  if (role === "ADMIN" || role === "STAFF") {
    base.push({
      id: "anomalies",
      label: "Alertas",
      icon: AlertCircle,
      color: "var(--color-rose-400)",
      onClick: () => navigate("/admin/dashboard/anomalies"),
    });
  }
  return base;
}