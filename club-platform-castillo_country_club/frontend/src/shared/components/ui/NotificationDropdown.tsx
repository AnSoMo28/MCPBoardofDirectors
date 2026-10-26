/**
 * NotificationDropdown.tsx
 * src/shared/components/ui/NotificationDropdown.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @namespace   .ui-notif
 * @keyframes   4 (ui-notif-panel-in, ui-notif-item-in, ui-notif-badge-pulse,
 *                 ui-notif-dot-pulse) — in NotificationDropdown.css
 * @depends     globals.css §1 tokens, lucide-react, useNavigate, localStorage
 *
 * PRE-WRITE VERIFICATION:
 * [x] cn utility verified in shared/lib/utils
 * [x] timeAgo verified in shared/lib/utils
 * [x] All lucide icons verified: Bell, Calendar, Building2, ClipboardCheck,
 *     AlertTriangle, CheckCheck, X, ChevronRight, Clock
 * [x] All tokens verified against globals.css §1
 * [x] useNavigate verified in react-router
 *
 * ANTI-PATTERNS REMOVED:
 * [x] framer-motion (4 instances) → CSS-only lifecycle (0KB)
 * [x] ~60 Tailwind utilities → BEM CSS
 * [x] font-[family-name:var(--font-*)] → CSS font-family
 * [x] ease: [0.25,0.1,0.25,1] → Apple cubic-bezier(0.32, 0.72, 0, 1)
 * [x] style={{ backgroundColor: "color-mix(...)" }} → data-notif-type + CSS
 * [x] style={{ scrollbarWidth: "none" }} → CSS scrollbar-width
 * [x] bg-white/[0.06] → CSS rgba
 * [x] transition-colors → specific properties
 * [x] text-xs/sm/[10px] mixed → CSS font-size
 * [x] leading-relaxed, mt-1, mr-0.5 → CSS
 * [x] glass-notification-* mixed namespace → .ui-notif BEM
 * [x] Non-namespaced keyframes → ui-notif-*
 * [x] Missing data-testid → added
 * [x] Missing reduced motion → CSS
 * [x] Missing print → CSS
 * [x] Missing responsive → CSS
 * [x] Mutable props → readonly
 */

// ═══ React core ═══
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type CSSProperties,
} from "react";

// ═══ Third-party ═══
import { useNavigate } from "react-router";
import {
  Bell,
  Calendar,
  Building2,
  ClipboardCheck,
  AlertTriangle,
  CheckCheck,
  X,
  ChevronRight
} from "lucide-react";

// ═══ Shared — values ═══
import { cn } from "@/shared/lib/utils";
import "./NotificationDropdown.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   ═══════════════════════════════════════════════════════════════ */

export type NotificationType = "reservation" | "event" | "approval" | "maintenance" | "alert";

export interface Notification {
  readonly id: string;
  readonly type: NotificationType;
  readonly message: string;
  readonly time: string;
  readonly read: boolean;
  readonly href: string;
  readonly urgent?: boolean;
}

type GroupKey = "action" | "today" | "recent";


/* ═══════════════════════════════════════════════════════════════
   §2  CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const MOCK_NOTIFICATIONS: readonly Notification[] = [
  {
    id: "1",
    type: "reservation",
    message: "Su reserva de Tennis fue confirmada para mañana 10:00 AM",
    time: "Hace 5 min",
    read: false,
    href: "/admin/facilities",
  },
  {
    id: "2",
    type: "event",
    message: "Nuevo evento: Cena de Gala este sábado a las 20:00",
    time: "Hace 1 hora",
    read: false,
    href: "/admin/events",
  },
  {
    id: "3",
    type: "maintenance",
    message: "La piscina estará cerrada por mantenimiento el lunes",
    time: "Hace 3 horas",
    read: true,
    href: "/admin/facilities",
    urgent: true,
  },
  {
    id: "4",
    type: "approval",
    message: "Solicitud de evento privado pendiente de su aprobación",
    time: "Ayer",
    read: false,
    href: "/admin/approvals",
    urgent: true,
  },
];

const TYPE_CONFIG: Record<NotificationType, {
  readonly icon: typeof Bell;
}> = {
  reservation: { icon: Building2 },
  event:       { icon: Calendar },
  approval:    { icon: ClipboardCheck },
  maintenance: { icon: AlertTriangle },
  alert:       { icon: AlertTriangle },
};

const GROUP_CONFIG: ReadonlyArray<{ readonly key: GroupKey; readonly label: string }> = [
  { key: "action", label: "Requiere acción" },
  { key: "today", label: "Hoy" },
  { key: "recent", label: "Reciente" },
];

const READ_STORAGE_KEY = "ccc-notif-dropdown-read";


/* ═══════════════════════════════════════════════════════════════
   §3  STORAGE HELPERS
   ═══════════════════════════════════════════════════════════════ */

function getReadSet(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadSet(ids: Set<string>): void {
  try {
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...ids]));
  } catch { /* quota exceeded */ }
}


/* ═══════════════════════════════════════════════════════════════
   §4  COMPONENT — NotificationDropdown
   Bell trigger + glass dropdown with smart grouping,
   read persistence, type-encoded visuals, entrance/exit lifecycle.
   CSS-only (no framer-motion).
   ═══════════════════════════════════════════════════════════════ */

export function NotificationDropdown() {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  /* ─── §4.1  State ────────────────────────────────────────── */

  const [isOpen, setIsOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(getReadSet);
  const [badgePulse, setBadgePulse] = useState(false);


  /* ─── §4.2  Derived ──────────────────────────────────────── */

  const unreadCount = MOCK_NOTIFICATIONS.filter(
    (n) => !readIds.has(n.id),
  ).length;

  const grouped = useMemo(() => {
    const buckets: Record<GroupKey, Notification[]> = {
      action: [],
      today: [],
      recent: [],
    };

    for (const n of MOCK_NOTIFICATIONS) {
      if (n.urgent || n.type === "approval") {
        buckets.action.push(n);
      } else if (n.type === "reservation" || n.type === "event") {
        buckets.today.push(n);
      } else {
        buckets.recent.push(n);
      }
    }

    return GROUP_CONFIG
      .map((g) => ({ ...g, items: buckets[g.key] }))
      .filter((g) => g.items.length > 0);
  }, []);


  /* ─── §4.3  Effects — Open/Close lifecycle ───────────────── */

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);


  /* ─── §4.4  Effects — Persist read state ─────────────────── */

  useEffect(() => {
    saveReadSet(readIds);
  }, [readIds]);


  /* ─── §4.5  Effects — Badge pulse on new unread ──────────── */

  const prevCountRef = useRef(0);

  useEffect(() => {
    if (unreadCount > prevCountRef.current && prevCountRef.current > 0) {
      setBadgePulse(true);
      const t = setTimeout(() => setBadgePulse(false), 500);
      return () => clearTimeout(t);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);


  /* ─── §4.6  Effects — Close on outside click + Escape ────── */

  useEffect(() => {
    if (!isOpen) return;
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);


  /* ─── §4.7  Handlers ─────────────────────────────────────── */

  const markAllRead = useCallback(() => {
    setReadIds(new Set(MOCK_NOTIFICATIONS.map((n) => n.id)));
  }, []);

  const handleItemClick = useCallback(
    (notification: Notification) => {
      setReadIds((prev) => new Set(prev).add(notification.id));
      setIsOpen(false);
      navigate(notification.href);
    },
    [navigate],
  );


  /* ─── §4.8  Render ───────────────────────────────────────── */

  return (
    <div ref={wrapperRef} data-testid="ui-notif" className="ui-notif">

      {/* Bell trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "ui-notif__bell",
          isOpen && "ui-notif__bell--open",
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ""}`}
      >
        <Bell size={18} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span
            className={cn(
              "ui-notif__badge",
              badgePulse && "ui-notif__badge--pulse",
            )}
            aria-hidden="true"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {shouldRender && (
        <div
          data-testid="ui-notif-panel"
          className={cn(
            "ui-notif__panel",
            isVisible && "ui-notif__panel--visible",
          )}
          role="menu"
          aria-label="Notificaciones"
        >
          {/* Header */}
          <div className="ui-notif__header">
            <h3 className="ui-notif__title">Notificaciones</h3>
            <div className="ui-notif__header-actions">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="ui-notif__markall"
                >
                  <CheckCheck size={12} aria-hidden="true" />
                  Marcar leídas
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="ui-notif__close"
                aria-label="Cerrar"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="ui-notif__scroll">
            {MOCK_NOTIFICATIONS.length === 0 ? (
              /* Empty state */
              <div className="ui-notif__empty">
                <div className="ui-notif__empty-icon" aria-hidden="true">
                  <Bell size={28} strokeWidth={1.2} />
                </div>
                <p className="ui-notif__empty-text">
                  Sin notificaciones nuevas
                </p>
              </div>
            ) : (
              /* Grouped notifications */
              <div>
                {grouped.map((group) => (
                  <div key={group.key} className="ui-notif__group">
                    <div className="ui-notif__group-header">
                      <p className="ui-notif__group-label">{group.label}</p>
                      <span className="ui-notif__group-count">
                        {group.items.length}
                      </span>
                    </div>

                    {group.items.map((notif, index) => {
                      const Icon = TYPE_CONFIG[notif.type].icon;
                      const isRead = readIds.has(notif.id);

                      return (
                        <div
                          key={notif.id}
                          data-notif-type={notif.type}
                          className={cn(
                            "ui-notif__item",
                            notif.urgent && "ui-notif__item--urgent",
                            isRead && "ui-notif__item--read",
                          )}
                          style={{ "--item-index": index } as CSSProperties}
                        >
                          <button
                            type="button"
                            onClick={() => handleItemClick(notif)}
                            className="ui-notif__item-content"
                            role="menuitem"
                          >
                            <div className="ui-notif__item-icon">
                              <Icon size={14} strokeWidth={1.5} />
                            </div>

                            <div className="ui-notif__item-body">
                              <div className="ui-notif__item-text-row">
                                <p className="ui-notif__item-message">
                                  {notif.message}
                                </p>
                                {!isRead && (
                                  <span className="ui-notif__unread-dot" aria-label="No leído" />
                                )}
                              </div>
                              <p className="ui-notif__item-time">
                                {notif.time}
                              </p>
                            </div>
                          </button>

                          {/* Navigate arrow */}
                          <button
                            type="button"
                            onClick={() => handleItemClick(notif)}
                            className="ui-notif__item-arrow"
                            aria-label="Ir a sección"
                          >
                            <ChevronRight size={11} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}