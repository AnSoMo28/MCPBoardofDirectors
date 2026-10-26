// src/shared/components/layout/WelcomeModal.tsx
// Fase 21 — Silver Tide Welcome Modal
// Glass · Staggered tips · Live data · Smart dismissal · Gold shimmer
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  X, LayoutDashboard, Users, DollarSign, Calendar,
  UserCheck, Home, FileText, Keyboard, Search,
  ArrowRight, Check,
} from "lucide-react";
import { useAuthStore, type UserRole } from "@/stores/auth.store";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { Button } from "@/shared/components/ui";
import './WelcomeModal.css';
/* ──────────────────────────────────────
   Types
   ────────────────────────────────────── */

interface WelcomeTip {
  icon: typeof LayoutDashboard;
  title: string;
  description: string;
  route?: string;
  /** Key to match against live data for badge display */
  liveDataKey?: string;
}

interface WelcomeContent {
  title: string;
  subtitle: string;
  tips: WelcomeTip[];
}

/* ──────────────────────────────────────
   Live data response types
   ────────────────────────────────────── */

interface AnomalyCountResponse {
  anomalies: { id: string }[];
}

interface TodayEventsResponse {
  events: { id?: string; date: string }[];
}

/* ──────────────────────────────────────
   Role-specific content
   ────────────────────────────────────── */

const WELCOME_CONTENT: Record<UserRole, WelcomeContent> = {
  ADMIN: {
    title: "Bienvenido al Panel de Administración",
    subtitle: "Tu centro de comando para gestionar el club. Todo lo que necesitás está a un click.",
    tips: [
      { icon: LayoutDashboard, title: "Dashboard Ejecutivo", description: "KPIs, anomalías y estado del club en tiempo real.", route: "/admin/dashboard", liveDataKey: "anomalies" },
      { icon: Users, title: "Gestión de Familias", description: "Buscá, editá y analizá perfiles de socios.", route: "/admin/families" },
      { icon: DollarSign, title: "Inteligencia Financiera", description: "Presupuestos, márgenes y alertas de gasto.", route: "/admin/finance" },
      { icon: Keyboard, title: "Atajos de teclado", description: "Presioná G+D para Dashboard, G+F para Familias, G+E para Eventos." },
    ],
  },
  STAFF: {
    title: "Bienvenido al Centro de Operaciones",
    subtitle: "Tu herramienta principal para el día a día del club.",
    tips: [
      { icon: UserCheck, title: "Check-in de Invitados", description: "Registrá visitas y emití credenciales de acceso.", route: "/operaciones/checkin" },
      { icon: Calendar, title: "Reservas del Día", description: "Ves todas las reservas de hoy de un vistazo.", route: "/operaciones/reservas", liveDataKey: "todayEvents" },
      { icon: Users, title: "Familias", description: "Consultá información de socios rápidamente.", route: "/admin/families" },
      { icon: Search, title: "Búsqueda rápida", description: "Presioná ⌘K para buscar cualquier cosa al instante." },
    ],
  },
  SOCIO: {
    title: "Bienvenido a tu Club",
    subtitle: "Explorá eventos, reservá instalaciones y gestioná tu cuenta.",
    tips: [
      { icon: Home, title: "Mi Club", description: "Tu portal principal con información personalizada.", route: "/mi-club" },
      { icon: Calendar, title: "Eventos", description: "Descubrí próximos eventos y confirmá asistencia.", route: "/mi-club/eventos", liveDataKey: "todayEvents" },
      { icon: DollarSign, title: "Mi Cuenta", description: "Consultá saldo, movimientos y realizá pagos.", route: "/mi-club/cuenta" },
    ],
  },
  JUNTA: {
    title: "Bienvenido al Panel Directivo",
    subtitle: "Información ejecutiva para la toma de decisiones estratégicas.",
    tips: [
      { icon: LayoutDashboard, title: "Dashboard Ejecutivo", description: "Resumen de salud del club con métricas clave.", route: "/junta/dashboard", liveDataKey: "anomalies" },
      { icon: FileText, title: "Board Reports", description: "Informes detallados para reuniones de junta.", route: "/junta/reportes" },
      { icon: DollarSign, title: "Inteligencia Financiera", description: "Análisis de presupuesto y proyecciones.", route: "/admin/finance" },
    ],
  },
};

/* ──────────────────────────────────────
   Storage helpers
   ────────────────────────────────────── */

function getSeenKey(userId: string): string {
  return `castillo-welcome-seen-${userId}`;
}

function getVisitedKey(userId: string): string {
  return `castillo-welcome-visited-${userId}`;
}

function getVisitedSet(userId: string): Set<number> {
  try {
    const raw = localStorage.getItem(getVisitedKey(userId));
    return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveVisitedSet(userId: string, visited: Set<number>): void {
  try {
    localStorage.setItem(getVisitedKey(userId), JSON.stringify([...visited]));
  } catch { /* quota */ }
}

/* ──────────────────────────────────────
   Animation variants
   ────────────────────────────────────── */

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.2 },
  },
};

const headerVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const tipVariants: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const footerVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

/* ──────────────────────────────────────
   Component
   ────────────────────────────────────── */

export function WelcomeModal() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const reduced = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [visitedTips, setVisitedTips] = useState<Set<number>>(new Set());

  /* ── Live data queries (for badge enrichment) ── */
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const role = user?.role ?? "SOCIO";

  const anomalyQ = useMCPQuery<AnomalyCountResponse>(
    "executive_dashboard",
    "detect_anomalies",
    {},
    { staleTime: 300_000, enabled: isOpen && (role === "ADMIN" || role === "JUNTA") },
  );

  const calendarQ = useMCPQuery<TodayEventsResponse>(
    "events",
    "event_get_calendar",
    { month: todayStr.slice(0, 7) },
    { staleTime: 120_000, enabled: isOpen },
  );

  /* ── Live data map ── */
  const liveDataMap = useMemo(() => {
    const map: Record<string, { count: number; label: string }> = {};

    if (anomalyQ.data?.anomalies) {
      const criticalCount = anomalyQ.data.anomalies.filter(
        (a: { id: string } & Record<string, unknown>) => {
          const severity = (a as Record<string, unknown>).severity;
          return severity === "high" || severity === "critical";
        },
      ).length;
      if (criticalCount > 0) {
        map.anomalies = { count: criticalCount, label: `${criticalCount} alerta${criticalCount > 1 ? "s" : ""}` };
      }
    }

    if (calendarQ.data?.events) {
      const todayEvents = calendarQ.data.events.filter((e) => e.date === todayStr);
      if (todayEvents.length > 0) {
        map.todayEvents = { count: todayEvents.length, label: `${todayEvents.length} hoy` };
      }
    }

    return map;
  }, [anomalyQ.data, calendarQ.data, todayStr]);

  /* ── Check if all tips visited → auto-dismiss ── */
  const checkAutoDismiss = useCallback(
    (userId: string, tips: WelcomeTip[], visited: Set<number>) => {
      const navigableCount = tips.filter((t) => t.route).length;
      if (navigableCount > 0 && visited.size >= navigableCount) {
        localStorage.setItem(getSeenKey(userId), "true");
        setIsOpen(false);
      }
    },
    [],
  );

  /* ── Open on first visit ── */
  useEffect(() => {
    if (!user) return;
    const seen = localStorage.getItem(getSeenKey(user.id));
    if (!seen) {
      const visited = getVisitedSet(user.id);
      setVisitedTips(visited);

      const content = WELCOME_CONTENT[user.role] ?? WELCOME_CONTENT.ADMIN;
      checkAutoDismiss(user.id, content.tips, visited);

      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [user, checkAutoDismiss]);

  /* ── Actions ── */
  const handleDismiss = useCallback(() => {
    if (user) {
      localStorage.setItem(getSeenKey(user.id), "true");
    }
    setIsOpen(false);
  }, [user]);

  const handleNavigate = useCallback(
    (route: string, tipIndex: number) => {
      if (user) {
        const next = new Set(visitedTips);
        next.add(tipIndex);
        setVisitedTips(next);
        saveVisitedSet(user.id, next);
      }
      handleDismiss();
      navigate(route);
    },
    [user, visitedTips, handleDismiss, navigate],
  );

  if (!user) return null;

  const content = WELCOME_CONTENT[user.role] ?? WELCOME_CONTENT.ADMIN;
  const navigableCount = content.tips.filter((t) => t.route).length;
  const visitedCount = content.tips.filter((t, i) => t.route && visitedTips.has(i)).length;
  const progressPct = navigableCount > 0 ? (visitedCount / navigableCount) * 100 : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          {/* ═══ Backdrop ═══ */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="glass-modal-overlay"
            onClick={handleDismiss}
            aria-hidden="true"
          />

          {/* ═══ Modal ═══ */}
          <motion.div
            variants={reduced ? undefined : modalVariants}
            initial={reduced ? undefined : "hidden"}
            animate={reduced ? undefined : "visible"}
            exit={reduced ? undefined : "exit"}
            className="glass-welcome-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Bienvenida"
          >
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="glass-welcome-modal__close"
              aria-label="Cerrar"
            >
              <X size={18} strokeWidth={1.5} />
            </button>

            {/* ═══ Header with gold shimmer ═══ */}
            <motion.div
              variants={reduced ? undefined : headerVariants}
              initial={reduced ? undefined : "hidden"}
              animate={reduced ? undefined : "visible"}
              className="glass-welcome-modal__header"
            >
              <div className="glass-welcome-modal__shimmer" aria-hidden="true" />
              <p className="glass-welcome-modal__brand">
                Castillo Country Club
              </p>
              <h2 className="glass-welcome-modal__title">
                {content.title}
              </h2>
              <p className="glass-welcome-modal__subtitle">
                {content.subtitle}
              </p>

              {/* Progress bar */}
              {navigableCount > 0 && (
                <div className="glass-welcome-progress">
                  <div className="glass-welcome-progress__track">
                    <motion.div
                      className="glass-welcome-progress__fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                  <span className="glass-welcome-progress__label">
                    {visitedCount}/{navigableCount} explorados
                  </span>
                </div>
              )}
            </motion.div>

            {/* ═══ Tips ═══ */}
            <motion.div
              variants={reduced ? undefined : listVariants}
              initial={reduced ? undefined : "hidden"}
              animate={reduced ? undefined : "visible"}
              className="glass-welcome-modal__tips"
            >
              {content.tips.map((tip, i) => {
                const Icon = tip.icon;
                const isVisited = tip.route && visitedTips.has(i);
                const liveData = tip.liveDataKey ? liveDataMap[tip.liveDataKey] : undefined;

                return (
                  <motion.div
                    key={i}
                    variants={reduced ? undefined : tipVariants}
                    className={
                      tip.route
                        ? `glass-welcome-tip glass-welcome-tip--interactive${isVisited ? " glass-welcome-tip--visited" : ""}`
                        : "glass-welcome-tip"
                    }
                    onClick={() => tip.route && handleNavigate(tip.route, i)}
                    role={tip.route ? "button" : undefined}
                    tabIndex={tip.route ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (tip.route && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        handleNavigate(tip.route, i);
                      }
                    }}
                  >
                    <div className="glass-welcome-tip__icon">
                      {isVisited ? (
                        <Check size={16} strokeWidth={2} />
                      ) : (
                        <Icon size={16} strokeWidth={1.5} />
                      )}
                    </div>

                    <div className="glass-welcome-tip__body">
                      <div className="flex items-center gap-2">
                        <p className="glass-welcome-tip__title">
                          {tip.title}
                        </p>
                        {liveData && (
                          <span className="glass-welcome-tip__live-badge">
                            {liveData.label}
                          </span>
                        )}
                      </div>
                      <p className="glass-welcome-tip__desc">
                        {tip.description}
                      </p>
                    </div>

                    {tip.route && (
                      <ArrowRight size={14} className="glass-welcome-tip__arrow" />
                    )}
                  </motion.div>
                );
              })}
            </motion.div>

            {/* ═══ Footer ═══ */}
            <motion.div
              variants={reduced ? undefined : footerVariants}
              initial={reduced ? undefined : "hidden"}
              animate={reduced ? undefined : "visible"}
              className="glass-welcome-modal__footer"
            >
              <Button variant="primary" onClick={handleDismiss}>
                {visitedCount >= navigableCount && navigableCount > 0
                  ? "¡Listo!"
                  : "Entendido"}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}