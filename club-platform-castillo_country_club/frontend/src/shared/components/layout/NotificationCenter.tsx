// src/shared/components/layout/NotificationCenter.tsx
// Fase 21 — Silver Tide Notification Center
// Glass · Animated presence · Severity encoding · Smart action groups · Inline quick actions
// ═══════════════════════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  Bell, ClipboardCheck, Calendar, AlertTriangle,
  CheckCheck, X, MessageSquare, ChevronRight,
} from "lucide-react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useAuthStore, type UserRole } from "@/stores/auth.store";
import { cn, timeAgo } from "@/shared/lib/utils";
import { useEvolutionAlerts } from "@/shared/hooks/useEvolutionAlerts";
import type { DetectAnomaliesResponse } from "@/shared/mocks/contracts";
import './NotificationCenter.css';
/* ──────────────────────────────────────
   Types
   ────────────────────────────────────── */

interface ApprovalRequest {
  id: string;
  status: string;
  tool?: string;
  requested_at?: string;
}

interface ApprovalListResponse {
  requests: ApprovalRequest[];
}

interface CalendarEvent {
  id?: string;
  name?: string;
  title?: string;
  date: string;
  time?: string;
}

interface CalendarResponse {
  events: CalendarEvent[];
}

interface Notification {
  id: string;
  type: "approval" | "event" | "anomaly" | "info";
  title: string;
  description: string;
  time: string;
  route: string;
  read: boolean;
  severity?: string;
  /** Original request ID — enables inline approve action */
  actionId?: string;
}

type ActionGroupKey = "action" | "today" | "recent";

/* ──────────────────────────────────────
   Constants
   ────────────────────────────────────── */

const TYPE_CONFIG: Record<
  string,
  { icon: typeof Bell; color: string; borderClass: string }
> = {
  approval: {
    icon: ClipboardCheck,
    color: "var(--color-amber-400)",
    borderClass: "--approval",
  },
  event: {
    icon: Calendar,
    color: "var(--color-teal-400)",
    borderClass: "--event",
  },
  anomaly: {
    icon: AlertTriangle,
    color: "var(--color-rose-400)",
    borderClass: "--anomaly",
  },
  info: {
    icon: MessageSquare,
    color: "var(--color-silver-400)",
    borderClass: "--info",
  },
};

const ROLE_APPROVAL_ROUTES: Partial<Record<UserRole, string>> = {
  ADMIN: "/admin/approvals",
};

const ROLE_EVENT_ROUTES: Record<string, string> = {
  ADMIN: "/admin/events",
  STAFF: "/operaciones/reservas",
  SOCIO: "/mi-club/eventos",
  JUNTA: "/junta/dashboard",
};

const ACTION_GROUPS: { key: ActionGroupKey; label: string }[] = [
  { key: "action", label: "Requiere acción" },
  { key: "today", label: "Hoy" },
  { key: "recent", label: "Reciente" },
];

/* ──────────────────────────────────────
   Animation variants
   ────────────────────────────────────── */

const dropdownVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: -8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const },
  },
  exit: { opacity: 0, scale: 0.98, y: -4, transition: { duration: 0.15 } },
};

const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

/* ──────────────────────────────────────
   useNotifications hook
   ────────────────────────────────────── */

function useNotifications() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? "SOCIO";
  const showApprovals = role === "ADMIN";

  /* ── Read state (persisted to localStorage) ── */
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("ccc-notif-read");
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("ccc-notif-read", JSON.stringify([...readIds]));
    } catch {
      /* quota exceeded — silent */
    }
  }, [readIds]);

  /* ── Dismissed IDs (optimistic, session-only) ── */
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  /* ── Queries ── */
  const approvalsQ = useMCPQuery<ApprovalListResponse>(
    "hitl",
    "get_pending_approvals",
    {},
    { staleTime: 60_000, refetchInterval: 60_000 },
  );

  const todayStr = new Date().toISOString().split("T")[0];

  const calendarQ = useMCPQuery<CalendarResponse>(
    "events",
    "event_get_calendar",
    { month: todayStr.slice(0, 7) },
    { staleTime: 120_000, refetchInterval: 120_000 },
  );

  const anomalyQ = useMCPQuery<DetectAnomaliesResponse>(
    "executive_dashboard",
    "detect_anomalies",
    {},
    { staleTime: 300_000, enabled: role === "ADMIN" || role === "JUNTA" },
  );

  const evolutionAlerts = useEvolutionAlerts();

  /* ── Derive notifications ── */
  const notifications = useMemo(() => {
    const items: Notification[] = [...evolutionAlerts];

    /* Approvals */
    if (showApprovals && approvalsQ.data?.requests) {
      const pending = approvalsQ.data.requests.filter(
        (r) => r.status === "pending" && !dismissedIds.has(r.id),
      );
      if (pending.length > 0) {
        items.push({
          id: "notif-approvals",
          type: "approval",
          title: `${pending.length} aprobación${pending.length > 1 ? "es" : ""} pendiente${pending.length > 1 ? "s" : ""}`,
          description: pending
            .slice(0, 3)
            .map((r) => r.tool ?? "Solicitud")
            .join(", "),
          time: pending[0]?.requested_at ?? new Date().toISOString(),
          route: ROLE_APPROVAL_ROUTES[role] ?? "/admin/approvals",
          read: false,
          actionId: pending[0]?.id,
        });
      }
    }

    /* Events today */
    if (calendarQ.data?.events) {
      const today = calendarQ.data.events.filter((e) => e.date === todayStr);
      if (today.length > 0) {
        items.push({
          id: "notif-events-today",
          type: "event",
          title: `${today.length} evento${today.length > 1 ? "s" : ""} hoy`,
          description: today
            .slice(0, 3)
            .map((e) => e.name ?? e.title ?? "Evento")
            .join(", "),
          time: new Date().toISOString(),
          route: ROLE_EVENT_ROUTES[role] ?? "/admin/events",
          read: false,
        });
      }
    }

    /* Anomalies */
    if (anomalyQ.data?.anomalies) {
      const critical = anomalyQ.data.anomalies.filter(
        (a) => a.severity === "high" || a.severity === "critical",
      );
      for (const anom of critical.slice(0, 3)) {
        if (dismissedIds.has(`anom-${anom.id}`)) continue;
        items.push({
          id: `notif-anom-${anom.id}`,
          type: "anomaly",
          title: anom.title,
          description: `Detectado ${timeAgo(anom.created_at ?? "")}`,
          time: anom.created_at ?? "",
          route: "/admin/dashboard",
          read: false,
          severity: anom.severity,
        });
      }
    }

    return items.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });
  }, [
    approvalsQ.data,
    calendarQ.data,
    anomalyQ.data,
    evolutionAlerts,
    showApprovals,
    role,
    todayStr,
    dismissedIds,
  ]);

  /* ── Smart action grouping ── */
  const grouped = useMemo(() => {
    const buckets: Record<ActionGroupKey, Notification[]> = {
      action: [],
      today: [],
      recent: [],
    };

    for (const n of notifications) {
      if (
        n.type === "approval" ||
        (n.type === "anomaly" && n.severity === "critical")
      ) {
        buckets.action.push(n);
      } else if (
        n.type === "event" ||
        (n.type === "anomaly" && n.severity !== "critical")
      ) {
        buckets.today.push(n);
      } else {
        buckets.recent.push(n);
      }
    }

    return ACTION_GROUPS.map((g) => ({
      ...g,
      items: buckets[g.key],
    })).filter((g) => g.items.length > 0);
  }, [notifications]);

  /* ── Actions ── */
  const markRead = useCallback((id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  }, [notifications]);

  const dismissNotification = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    setReadIds((prev) => new Set(prev).add(id));
  }, []);

  /* ── Derived ── */
  const unreadCount = notifications.filter(
    (n) => !readIds.has(n.id) && !dismissedIds.has(n.id),
  ).length;

  const isLoading =
    (approvalsQ.isLoading && !approvalsQ.data) ||
    (calendarQ.isLoading && !calendarQ.data);

  return {
    notifications,
    grouped,
    readIds,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
    dismissNotification,
  };
}

/* ──────────────────────────────────────
   Sub-components
   ────────────────────────────────────── */

function NotificationSkeleton() {
  return (
    <div className="p-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="glass-notification-skeleton"
          style={{ animationDelay: `${i * 120}ms` }}
        >
          <div className="glass-notification-skeleton__icon" />
          <div className="glass-notification-skeleton__body">
            <div className="glass-notification-skeleton__title" />
            <div className="glass-notification-skeleton__desc" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationEmpty() {
  return (
    <div className="glass-notification-empty">
      <div className="glass-notification-empty__icon">
        <Bell size={28} strokeWidth={1.2} />
      </div>
      <p className="glass-notification-empty__text">
        Todo tranquilo en el club
      </p>
    </div>
  );
}

/* ──────────────────────────────────────
   Main component
   ────────────────────────────────────── */

export function NotificationCenter() {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const {
    notifications,
    grouped,
    readIds,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
    dismissNotification,
  } = useNotifications();

  /* ── Bell badge pulse on count increase ── */
  const prevCountRef = useRef(0);
  const [badgePulse, setBadgePulse] = useState(false);

  useEffect(() => {
    if (unreadCount > prevCountRef.current && prevCountRef.current > 0) {
      setBadgePulse(true);
      const t = setTimeout(() => setBadgePulse(false), 500);
      return () => clearTimeout(t);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  /* ── Close on outside click ── */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  /* ── Close on Escape ── */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  /* ── Click → navigate ── */
  const handleClick = (notif: Notification) => {
    markRead(notif.id);
    setOpen(false);
    navigate(notif.route);
  };

  /* ── Approve (optimistic dismiss + backend call) ── */
  const handleApprove = useCallback(
    async (notif: Notification) => {
      if (!notif.actionId) return;
      dismissNotification(notif.id);
      try {
        const { routeMCPCall } = await import("@/shared/lib/mcp");
        await routeMCPCall("hitl", "approve_request", {
          request_id: notif.actionId,
        }, {} as import("@/shared/lib/mcp").MCPRouterConfig);
      } catch {
        /* Optimistic state already applied — silent fail */
      }
    },
    [dismissNotification],
  );

  /* ── Dismiss anomaly ── */
  const handleDismiss = useCallback(
    (notif: Notification) => {
      dismissNotification(notif.id);
    },
    [dismissNotification],
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ═══ Bell trigger ═══ */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "glass-notification-bell relative p-2 rounded-lg transition-colors",
          "min-h-[40px] min-w-[40px] flex items-center justify-center",
          open && "bg-white/[0.06]",
        )}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell
          size={18}
          strokeWidth={1.5}
          className="text-[var(--color-silver-300)]"
        />
        {unreadCount > 0 && (
          <span
            className={cn(
              "glass-notification-badge",
              badgePulse && "glass-notification-badge--pulse",
            )}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ═══ Dropdown ═══ */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="glass-notification-dropdown"
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="menu"
            aria-label="Notificaciones"
          >
            {/* Header */}
            <div className="glass-notification-dropdown__header">
              <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                Notificaciones
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="glass-notification-markall"
                  >
                    <CheckCheck size={12} />
                    Marcar leídas
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded hover:bg-white/[0.06] transition-colors"
                  aria-label="Cerrar"
                >
                  <X size={14} className="text-[var(--color-silver-500)]" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div
              className="overflow-y-auto max-h-[400px]"
              style={{ scrollbarWidth: "none" }}
            >
              {isLoading ? (
                <NotificationSkeleton />
              ) : notifications.length === 0 ? (
                <NotificationEmpty />
              ) : (
                <motion.div
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {grouped.map((group) => (
                    <div key={group.key}>
                      <div className="glass-notification-group__header">
                        <p>{group.label}</p>
                        <span className="glass-notification-group__count">
                          {group.items.length}
                        </span>
                      </div>

                      {group.items.map((notif) => {
                        const config =
                          TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.info;
                        const Icon = config.icon;
                        const isRead = readIds.has(notif.id);
                        const isCritical =
                          notif.severity === "critical" ||
                          notif.severity === "high";
                        const isApproval = notif.type === "approval";
                        const isAnomaly = notif.type === "anomaly";

                        return (
                          <motion.div
                            key={notif.id}
                            variants={itemVariants}
                            className={cn(
                              "glass-notification-item",
                              `glass-notification-item${config.borderClass}`,
                              isCritical &&
                                isAnomaly &&
                                "glass-notification-item--critical",
                              isRead && "glass-notification-item--read",
                            )}
                          >
                            {/* Clickable content */}
                            <button
                              onClick={() => handleClick(notif)}
                              className="glass-notification-item__content"
                              role="menuitem"
                            >
                              <div
                                className="glass-notification-item__icon"
                                style={{
                                  backgroundColor: `color-mix(in srgb, ${config.color} 12%, transparent)`,
                                  color: config.color,
                                }}
                              >
                                <Icon size={14} strokeWidth={1.5} />
                              </div>

                              <div className="glass-notification-item__body">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] leading-snug">
                                    {notif.title}
                                  </p>
                                  {!isRead && (
                                    <span className="glass-notification-unread-dot" />
                                  )}
                                </div>
                                <p className="text-[11px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-0.5 line-clamp-2">
                                  {notif.description}
                                </p>
                                <p className="text-[10px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)] mt-1">
                                  {timeAgo(notif.time)}
                                </p>
                              </div>
                            </button>

                            {/* Quick actions */}
                            {(isApproval || isAnomaly) && (
                              <div className="glass-notification-item__actions">
                                {isApproval && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApprove(notif);
                                    }}
                                    className="glass-notification-quick-btn glass-notification-quick-btn--approve"
                                    aria-label="Aprobar solicitud"
                                  >
                                    <CheckCheck size={11} />
                                    <span>Aprobar</span>
                                  </button>
                                )}
                                {isAnomaly && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDismiss(notif);
                                    }}
                                    className="glass-notification-quick-btn glass-notification-quick-btn--dismiss"
                                    aria-label="Descartar anomalía"
                                  >
                                    <X size={11} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleClick(notif)}
                                  className="glass-notification-quick-btn glass-notification-quick-btn--navigate"
                                  aria-label="Ir a sección"
                                >
                                  <ChevronRight size={11} />
                                </button>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}