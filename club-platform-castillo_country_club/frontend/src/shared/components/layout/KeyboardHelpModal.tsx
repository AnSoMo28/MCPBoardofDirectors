// src/shared/components/layout/KeyboardHelpModal.tsx
// Fase 21 — Silver Tide Keyboard Help Modal
// Glass · Search · Stagger · Category encoding · Active test · Recent shortcuts
// ═══════════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { X, Keyboard, Search, Zap, Clock } from "lucide-react";
import { useAuthStore, type UserRole } from "@/stores/auth.store";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import './KeyboardHelpModal.css';
/* ──────────────────────────────────────
   Types
   ────────────────────────────────────── */

interface ShortcutDef {
  keys: string;
  label: string;
  category: string;
  roles: UserRole[];
  /** Browser override — may conflict with native shortcut */
  overridesBrowser?: boolean;
  /** Normalized key for matching (lowercase, no spaces) */
  matchKey: string;
}

/* ──────────────────────────────────────
   Shortcut definitions
   ────────────────────────────────────── */

const SHORTCUTS: ShortcutDef[] = [
  /* Go-To navigation */
  { keys: "G  D", label: "Dashboard", category: "Navegación", roles: ["ADMIN"], matchKey: "gd" },
  { keys: "G  F", label: "Familias", category: "Navegación", roles: ["ADMIN", "STAFF"], matchKey: "gf" },
  { keys: "G  E", label: "Eventos", category: "Navegación", roles: ["ADMIN", "STAFF"], matchKey: "ge" },
  { keys: "G  Z", label: "Finanzas", category: "Navegación", roles: ["ADMIN"], matchKey: "gz" },
  { keys: "G  A", label: "Aprobaciones", category: "Navegación", roles: ["ADMIN"], matchKey: "ga" },
  { keys: "G  C", label: "Comunicaciones", category: "Navegación", roles: ["ADMIN"], matchKey: "gc" },
  { keys: "G  G", label: "Engagement", category: "Navegación", roles: ["ADMIN"], matchKey: "gg" },
  { keys: "G  R", label: "Instalaciones", category: "Navegación", roles: ["ADMIN", "STAFF"], matchKey: "gr" },
  { keys: "G  H", label: "Check-in", category: "Navegación", roles: ["STAFF"], matchKey: "gh" },
  { keys: "G  O", label: "Operaciones", category: "Navegación", roles: ["STAFF", "ADMIN"], matchKey: "go" },
  { keys: "G  M", label: "Mi Club", category: "Navegación", roles: ["SOCIO"], matchKey: "gm" },
  { keys: "G  J", label: "Junta", category: "Navegación", roles: ["JUNTA"], matchKey: "gj" },

  /* Global */
  { keys: "⌘  K", label: "Búsqueda rápida", category: "Global", roles: ["ADMIN", "STAFF", "SOCIO", "JUNTA"], matchKey: "cmdk", overridesBrowser: true },
  { keys: "?", label: "Esta ayuda", category: "Global", roles: ["ADMIN", "STAFF", "SOCIO", "JUNTA"], matchKey: "?" },
  { keys: "⌘  .", label: "Focus Mode", category: "Global", roles: ["ADMIN", "STAFF", "SOCIO", "JUNTA"], matchKey: "cmd.", overridesBrowser: true },
];

/* ──────────────────────────────────────
   Category config
   ────────────────────────────────────── */

const CATEGORY_CONFIG: Record<string, { color: string; label: string }> = {
  "Navegación": { color: "var(--color-gold-400)", label: "Navegación" },
  "Global": { color: "var(--color-teal-400)", label: "Global" },
};

/* ──────────────────────────────────────
   Recent shortcuts (localStorage)
   ────────────────────────────────────── */

const RECENT_STORAGE_KEY = "ccc-shortcut-recent";
const MAX_RECENT = 3;

function getRecentShortcuts(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function trackShortcut(matchKey: string): void {
  try {
    const recent = getRecentShortcuts().filter((k) => k !== matchKey);
    recent.unshift(matchKey);
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch { /* quota */ }
}

/* ──────────────────────────────────────
   Animation variants
   ────────────────────────────────────── */

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 8,
    transition: { duration: 0.15 },
  },
};

const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03, delayChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const groupHeaderVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

/* ──────────────────────────────────────
   Component
   ────────────────────────────────────── */

interface KeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardHelpModal({ isOpen, onClose }: KeyboardHelpModalProps) {
  const role = useAuthStore((s) => s.user?.role);
  const reduced = useReducedMotion();
  const [search, setSearch] = useState("");
  const [activeMatch, setActiveMatch] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Reset search on open ── */
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setActiveMatch(null);
      /* Focus search input after animation */
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  /* ── Close on Escape ── */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  /* ── Active shortcut detection ── */
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      /* Skip if typing in search */
      if (document.activeElement === inputRef.current && e.key !== "Escape") return;

      /* Build match key from pressed combo */
      let mk = "";
      if (e.metaKey || e.ctrlKey) mk += "cmd";
      if (e.shiftKey) mk += "shift";
      if (e.altKey) mk += "alt";
      mk += e.key.toLowerCase();

      /* Track and highlight */
      trackShortcut(mk);
      setActiveMatch(mk);
      setTimeout(() => setActiveMatch(null), 1200);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  /* ── Close on outside click ── */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  /* ── Filter shortcuts by role + search ── */
  const visibleShortcuts = useMemo(() => {
    if (!role) return [];
    const filtered = SHORTCUTS.filter((s) => s.roles.includes(role));
    if (!search.trim()) return filtered;

    const q = search.toLowerCase().trim();
    return filtered.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.keys.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  }, [role, search]);

  /* ── Recent shortcuts ── */
  const recentShortcuts = useMemo(() => {
    const recent = getRecentShortcuts();
    return recent
      .map((mk) => visibleShortcuts.find((s) => s.matchKey === mk))
      .filter(Boolean) as ShortcutDef[];
  }, [visibleShortcuts]);

  const hasRecent = recentShortcuts.length > 0 && !search.trim();

  /* ── Group by category (excluding recent) ── */
  const groups = useMemo(() => {
    const recentIds = new Set(recentShortcuts.map((s) => s.matchKey));
    const remaining = hasRecent
      ? visibleShortcuts.filter((s) => !recentIds.has(s.matchKey))
      : visibleShortcuts;

    const map = new Map<string, ShortcutDef[]>();
    for (const s of remaining) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    return map;
  }, [visibleShortcuts, recentShortcuts, hasRecent]);

  if (!role) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          {/* ═══ Backdrop ═══ */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="glass-modal-overlay"
            aria-hidden="true"
          />

          {/* ═══ Modal ═══ */}
          <motion.div
            variants={reduced ? undefined : modalVariants}
            initial={reduced ? undefined : "hidden"}
            animate={reduced ? undefined : "visible"}
            exit={reduced ? undefined : "exit"}
            className="glass-kbd-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Atajos de teclado"
          >
            {/* ═══ Header ═══ */}
            <div className="glass-kbd-modal__header">
              <div className="flex items-center gap-2">
                <Keyboard size={18} className="text-[var(--color-gold-400)]" />
                <h2 className="glass-kbd-modal__title">
                  Atajos de teclado
                </h2>
              </div>
              <button
                onClick={onClose}
                className="glass-kbd-modal__close"
                aria-label="Cerrar"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* ═══ Search ═══ */}
            <div className="glass-kbd-modal__search">
              <Search size={14} className="glass-kbd-modal__search-icon" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar atajo..."
                className="glass-kbd-modal__search-input"
                aria-label="Buscar atajos de teclado"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="glass-kbd-modal__search-clear"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* ═══ Content ═══ */}
            <div
              className="glass-kbd-modal__content"
              style={{ scrollbarWidth: "none" }}
            >
              {visibleShortcuts.length === 0 ? (
                <div className="glass-kbd-modal__empty">
                  <Search size={20} className="text-[var(--color-silver-600)]" />
                  <p>Sin resultados para &ldquo;{search}&rdquo;</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* ── Recent shortcuts ── */}
                  {hasRecent && (
                    <motion.div
                      variants={reduced ? undefined : listVariants}
                      initial={reduced ? undefined : "hidden"}
                      animate={reduced ? undefined : "visible"}
                    >
                      <motion.div
                        variants={reduced ? undefined : groupHeaderVariants}
                        className="glass-kbd-modal__group-header"
                      >
                        <Clock size={11} className="text-[var(--color-silver-500)]" />
                        <p>Recientes</p>
                      </motion.div>

                      {recentShortcuts.map((s) => (
                        <ShortcutRow
                          key={`recent-${s.matchKey}`}
                          shortcut={s}
                          isActive={activeMatch === s.matchKey}
                          variants={reduced ? undefined : itemVariants}
                        />
                      ))}
                    </motion.div>
                  )}

                  {/* ── Categorized groups ── */}
                  {Array.from(groups.entries()).map(([category, shortcuts]) => {
                    const config = CATEGORY_CONFIG[category] ?? {
                      color: "var(--color-silver-400)",
                      label: category,
                    };

                    return (
                      <motion.div
                        key={category}
                        variants={reduced ? undefined : listVariants}
                        initial={reduced ? undefined : "hidden"}
                        animate={reduced ? undefined : "visible"}
                      >
                        <motion.div
                          variants={reduced ? undefined : groupHeaderVariants}
                          className="glass-kbd-modal__group-header"
                        >
                          <div
                            className="glass-kbd-modal__group-dot"
                            style={{ backgroundColor: config.color }}
                          />
                          <p>{config.label}</p>
                        </motion.div>

                        {shortcuts.map((s) => (
                          <ShortcutRow
                            key={s.matchKey}
                            shortcut={s}
                            isActive={activeMatch === s.matchKey}
                            variants={reduced ? undefined : itemVariants}
                          />
                        ))}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ═══ Footer ═══ */}
            <div className="glass-kbd-modal__footer">
              <p>
                Presioná{" "}
                <kbd className="glass-kbd">?</kbd> para abrir esta ayuda ·{" "}
                <kbd className="glass-kbd">Esc</kbd> para cerrar
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────────────────
   ShortcutRow sub-component
   ────────────────────────────────────── */

interface ShortcutRowProps {
  shortcut: ShortcutDef;
  isActive: boolean;
  variants?: Variants;
}

function ShortcutRow({ shortcut, isActive, variants }: ShortcutRowProps) {
  const config = CATEGORY_CONFIG[shortcut.category] ?? {
    color: "var(--color-silver-400)",
  };

  return (
    <motion.div
      variants={variants}
      className={`glass-kbd-row ${isActive ? "glass-kbd-row--active" : ""}`}
      style={{ borderLeftColor: config.color }}
    >
      <span className="glass-kbd-row__label">{shortcut.label}</span>

      <div className="glass-kbd-row__keys">
        {shortcut.keys.split(/\s{2,}/).map((key, i) => (
          <span key={i} className="glass-kbd-row__key-group">
            {i > 0 && <span className="glass-kbd-row__then">then</span>}
            <kbd className="glass-kbd">{key}</kbd>
          </span>
        ))}
        {shortcut.overridesBrowser && (
          <span className="glass-kbd-row__override-badge" title="Sobreescribe atajo del navegador">
            <Zap size={9} />
          </span>
        )}
      </div>
    </motion.div>
  );
}