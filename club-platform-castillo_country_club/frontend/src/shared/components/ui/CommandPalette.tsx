/**
 * CommandPalette.tsx
 * src/shared/components/ui/CommandPalette.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @namespace   .ui-cmd
 * @keyframes   1 (ui-cmd-spin) — in CommandPalette.css
 * @depends     globals.css §1 tokens, createFocusTrap, callMCPTool,
 *             buildFinancialCommands, lucide-react, useReducedMotion
 *
 * PRE-WRITE VERIFICATION:
 * [x] cn utility verified in shared/lib/utils
 * [x] createFocusTrap verified in shared/lib/focusTrap
 * [x] callMCPTool verified in shared/lib/api
 * [x] buildFinancialCommands verified in features/finance/lib/financialCommands
 * [x] All lucide icons verified (Search, Calendar, Building2, Users,
 *     LayoutDashboard, DollarSign, MessageSquare, Heart, FileText,
 *     ClipboardCheck, Home, CalendarPlus, UserPlus, ArrowRight)
 * [x] All tokens verified against globals.css §1
 * [x] useReducedMotion verified in shared/hooks/useReducedMotion
 *
 * ANTI-PATTERNS REMOVED:
 * [x] ~120+ Tailwind utilities → 100% BEM CSS (CommandPalette.css)
 * [x] font-[ family-name:var(--font-*) ] ×12 → CSS font-family
 * [x] animate-[fadeIn/scaleIn] arbitrary → CSS transitions
 * [x] animate-spin → CSS keyframe
 * [x] style={{ background }} ×2 → CSS
 * [x] shadow-[0_24px_80px...] arbitrary → CSS
 * [x] border-white/[0.12], [0.06] → CSS rgba()
 * [x] bg-[ var(--*) ]/10 → CSS color-mix()
 * [x] bg-[var(--color-surface-3)] ×5 → CSS
 * [x] glass-card old class → BEM CSS
 * [x] globalIdx mutable counter → itemIndexMap useMemo
 * [x] z-[100], pt-[15vh], max-h-[50vh] → CSS
 * [x] mousedown document listener → onClick overlay
 * [x] Missing data-testid → added
 * [x] Missing aria-hidden → added
 * [x] Missing reduced motion → CSS + hook
 * [x] Missing print → CSS
 * [x] Mutable props/interface → readonly
 */

// ═══ React core ═══
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import type { ReactNode } from "react";

// ═══ Third-party ═══
import { useNavigate, useLocation } from "react-router";
import {
  Search,
  Calendar,
  Building2,
  Users,
  LayoutDashboard,
  DollarSign,
  MessageSquare,
  Heart,
  FileText,
  ClipboardCheck,
  Home,
  CalendarPlus,
  UserPlus,
  ArrowRight,
} from "lucide-react";

// ═══ Shared — values ═══
import { cn } from "@/shared/lib/utils";
import { createFocusTrap } from "@/shared/lib/focusTrap";
import { callMCPTool } from "@/shared/lib/api";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";

// ═══ Feature — finance ═══
import { buildFinancialCommands } from "@/features/finance/lib/financialCommands";
import "./CommandPalette.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   ═══════════════════════════════════════════════════════════════ */

interface CommandItem {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly icon: ReactNode;
  readonly category: string;
  readonly action: () => void;
  readonly keywords?: readonly string[];
}


/* ═══════════════════════════════════════════════════════════════
   §2  CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

/** Session storage keys for finance tab persistence. */
const FINANCE_TAB_KEY = "castillo-finance-active-tab";
const FINANCE_TOOL_TAB_KEY = "castillo-finance-tool-tab";

/** Default icon size for all command items. */
const ICON_SIZE = 16;


/* ═══════════════════════════════════════════════════════════════
   §3  ITEM BUILDERS
   Pure functions that produce CommandItem arrays.
   ═══════════════════════════════════════════════════════════════ */

function buildNavItems(navigate: (path: string) => void): readonly CommandItem[] {
  const routes: ReadonlyArray<{
    readonly label: string;
    readonly path: string;
    readonly icon: ReactNode;
    readonly category: string;
  }> = [
    { label: "Dashboard",       path: "/admin/dashboard",              icon: <LayoutDashboard size={ICON_SIZE} />, category: "Navegación" },
    { label: "Familias",        path: "/admin/families",               icon: <Users size={ICON_SIZE} />,          category: "Navegación" },
    { label: "Eventos",         path: "/admin/events",                 icon: <Calendar size={ICON_SIZE} />,       category: "Navegación" },
    { label: "Instalaciones",   path: "/admin/facilities",             icon: <Building2 size={ICON_SIZE} />,      category: "Navegación" },
    { label: "Finanzas",        path: "/admin/finance",                icon: <DollarSign size={ICON_SIZE} />,     category: "Navegación" },
    { label: "Comunicaciones",  path: "/admin/communications",         icon: <MessageSquare size={ICON_SIZE} />,  category: "Navegación" },
    { label: "Engagement",      path: "/admin/engagement",             icon: <Heart size={ICON_SIZE} />,          category: "Navegación" },
    { label: "Documentos",      path: "/admin/documents",              icon: <FileText size={ICON_SIZE} />,       category: "Navegación" },
    { label: "Conocimiento",    path: "/admin/documents/knowledge",    icon: <FileText size={ICON_SIZE} />,       category: "Navegación" },
    { label: "Aprobaciones",    path: "/admin/approvals",              icon: <ClipboardCheck size={ICON_SIZE} />, category: "Navegación" },
    { label: "Mi Club",         path: "/mi-club",                      icon: <Home size={ICON_SIZE} />,           category: "Mi Club" },
    { label: "Mis Reservas",    path: "/mi-club/reservas",             icon: <Building2 size={ICON_SIZE} />,      category: "Mi Club" },
    { label: "Board Reports",   path: "/junta/reportes",               icon: <FileText size={ICON_SIZE} />,       category: "Junta" },
    { label: "Estrategia",      path: "/junta/estrategia",             icon: <FileText size={ICON_SIZE} />,       category: "Junta" },
  ];

  return routes.map((r) => ({
    id: `nav-${r.path}`,
    label: r.label,
    description: r.path,
    icon: r.icon,
    category: r.category,
    action: () => navigate(r.path),
    keywords: [r.label.toLowerCase(), r.path],
  }));
}

function buildQuickActions(navigate: (path: string) => void): readonly CommandItem[] {
  return [
    {
      id: "qa-new-event",
      label: "Crear evento",
      description: "Programar un nuevo evento",
      icon: <CalendarPlus size={ICON_SIZE} />,
      category: "Acciones rápidas",
      action: () => navigate("/admin/events/new"),
    },
    {
      id: "qa-new-family",
      label: "Registrar familia",
      description: "Agregar nueva familia al club",
      icon: <UserPlus size={ICON_SIZE} />,
      category: "Acciones rápidas",
      action: () => navigate("/admin/families/new"),
    },
    {
      id: "qa-facilities",
      label: "Ver instalaciones",
      description: "Mapa de instalaciones disponibles",
      icon: <Building2 size={ICON_SIZE} />,
      category: "Acciones rápidas",
      action: () => navigate("/admin/facilities"),
    },
  ];
}

function buildFinanceCommandItems(navigate: (path: string) => void): readonly CommandItem[] {
  const financeCmds = buildFinancialCommands({
    navigateToTab: (tab) => {
      sessionStorage.setItem(FINANCE_TAB_KEY, tab);
      navigate("/admin/finance");
    },
    navigateToToolTab: (tab) => {
      sessionStorage.setItem(FINANCE_TAB_KEY, "tools");
      sessionStorage.setItem(FINANCE_TOOL_TAB_KEY, tab);
      navigate("/admin/finance");
    },
    generateReport: () => {
      sessionStorage.setItem(FINANCE_TAB_KEY, "tools");
      sessionStorage.setItem(FINANCE_TOOL_TAB_KEY, "reports");
      navigate("/admin/finance");
    },
    openStressTest: () => {
      sessionStorage.setItem(FINANCE_TAB_KEY, "intelligence");
      navigate("/admin/finance");
    },
    exportData: (format) => {
      sessionStorage.setItem(FINANCE_TAB_KEY, "tools");
      sessionStorage.setItem(FINANCE_TOOL_TAB_KEY, "reports");
      navigate("/admin/finance");
      void format;
    },
  });

  return financeCmds.map((cmd) => ({
    id: cmd.id,
    label: cmd.label,
    description: cmd.description,
    icon: <cmd.icon size={ICON_SIZE} />,
    category: "Finanzas",
    action: cmd.action,
    keywords: cmd.keywords,
  }));
}


/* ═══════════════════════════════════════════════════════════════
   §4  COMPONENT — CommandPalette
   Global command palette (Cmd+K / Ctrl+K).
   Searches navigation, quick actions, finance commands,
   and live MCP results (families, events).
   CSS-only lifecycle (no framer-motion).
   ═══════════════════════════════════════════════════════════════ */

export function CommandPalette() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReduced = useReducedMotion();

  /* ─── §4.1  Lifecycle state ──────────────────────────────── */
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  /* ─── §4.2  Interaction state ────────────────────────────── */
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);

  /* ─── §4.3  Refs ─────────────────────────────────────────── */
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ─── §4.4  Derived — route detection ────────────────────── */
  const isFinanceRoute = location.pathname.startsWith("/admin/finance");


  /* ─── §4.5  Effects — Modal lifecycle ────────────────────── */

  // Close on route change
  useEffect(() => {
    setShouldRender(false);
    setIsVisible(false);
    setQuery("");
  }, [location.pathname]);

  // Open/close lifecycle
  useEffect(() => {
    const toggle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (shouldRender) {
          setIsVisible(false);
          setShouldRender(false);
        } else {
          setShouldRender(true);
          setQuery("");
          setSelectedIdx(0);
          if (prefersReduced) {
            setIsVisible(true);
          } else {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => setIsVisible(true));
            });
          }
        }
      }
    };
    window.addEventListener("keydown", toggle);
    return () => window.removeEventListener("keydown", toggle);
  }, [shouldRender, prefersReduced]);


  /* ─── §4.6  Effects — Focus trap ─────────────────────────── */

  useEffect(() => {
    if (!shouldRender || !panelRef.current) return;
    const release = createFocusTrap(panelRef.current);
    return release;
  }, [shouldRender]);


  /* ─── §4.7  Effects — Escape key ─────────────────────────── */

  useEffect(() => {
    if (!isVisible) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsVisible(false);
        setShouldRender(false);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isVisible]);


  /* ─── §4.8  Handlers ─────────────────────────────────────── */

  const close = useCallback(() => {
    setIsVisible(false);
    setShouldRender(false);
  }, []);

  const navigateAndClose = useCallback(
    (path: string) => {
      navigate(path);
      close();
    },
    [navigate, close],
  );


  /* ─── §4.9  Item building ────────────────────────────────── */

  const navItems = useMemo(() => buildNavItems(navigateAndClose), [navigateAndClose]);
  const quickActions = useMemo(() => buildQuickActions(navigateAndClose), [navigateAndClose]);

  const financeItems = useMemo(
    () => (isFinanceRoute ? buildFinanceCommandItems(navigateAndClose) : []),
    [isFinanceRoute, navigateAndClose],
  );


  /* ─── §4.10  Live MCP search ─────────────────────────────── */

  const [mcpResults, setMcpResults] = useState<readonly CommandItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (q.length < 2) {
      setMcpResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results: CommandItem[] = [];

      try {
        const familyRes = await callMCPTool<{
          data?: { families?: Array<{ id: string; familyName: string; tier: string; status: string }> };
        }>("families", "family_search", { query: q, limit: 5 });

        for (const f of familyRes?.data?.families ?? []) {
          results.push({
            id: `search-family-${f.id}`,
            label: f.familyName,
            description: `${f.tier} · ${f.status}`,
            icon: <Users size={ICON_SIZE} />,
            category: "Familias",
            action: () => navigateAndClose(`/admin/families/${f.id}`),
            keywords: [f.familyName.toLowerCase()],
          });
        }
      } catch { /* best-effort */ }

      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const eventRes = await callMCPTool<{
          events?: Array<{ id?: string; name?: string; title?: string; date: string; venue?: string }>;
        }>("events", "event_get_calendar", { month: todayStr.slice(0, 7) });

        const qLower = q.toLowerCase();
        const matched = (eventRes?.events ?? [])
          .filter((e) => (e.name ?? e.title ?? "").toLowerCase().includes(qLower))
          .slice(0, 5);

        for (const ev of matched) {
          const evName = ev.name ?? ev.title ?? "Evento";
          results.push({
            id: `search-event-${ev.id ?? ev.date}`,
            label: evName,
            description: `${ev.date}${ev.venue ? ` · ${ev.venue}` : ""}`,
            icon: <Calendar size={ICON_SIZE} />,
            category: "Eventos",
            action: () => navigateAndClose(`/admin/events/${ev.id ?? ""}`),
            keywords: [evName.toLowerCase()],
          });
        }
      } catch { /* best-effort */ }

      setMcpResults(results);
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, navigateAndClose]);


  /* ─── §4.11  Filtering + grouping ────────────────────────── */

  const allItems = useMemo(() => {
    const base = [...quickActions, ...navItems, ...financeItems];
    if (!query.trim()) return base;

    const q = query.toLowerCase();
    const filtered = base.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.keywords?.some((kw) => kw.includes(q)),
    );
    return [...mcpResults, ...filtered];
  }, [query, navItems, quickActions, financeItems, mcpResults]);

  const groups = useMemo(() => {
    const order = isFinanceRoute
      ? ["Finanzas", "Acciones rápidas", "Navegación", "Mi Club", "Junta", "Familias", "Eventos"]
      : ["Acciones rápidas", "Navegación", "Mi Club", "Junta", "Familias", "Eventos"];

    const map = new Map<string, CommandItem[]>();
    for (const item of allItems) {
      const existing = map.get(item.category);
      if (existing) existing.push(item);
      else map.set(item.category, [item]);
    }

    return Array.from(map.entries()).sort(([a], [b]) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
  }, [allItems, isFinanceRoute]);

  const flatItems = useMemo(() => groups.flatMap(([, items]) => items), [groups]);

  /** Map from item ID → flat index. Replaces mutable globalIdx counter. */
  const itemIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    flatItems.forEach((item, i) => map.set(item.id, i));
    return map;
  }, [flatItems]);

  // Clamp selected index when items change
  useEffect(() => {
    setSelectedIdx((i) => Math.min(i, Math.max(0, flatItems.length - 1)));
  }, [flatItems.length]);


  /* ─── §4.12  Keyboard navigation ─────────────────────────── */

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIdx((i) => (i + 1) % flatItems.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIdx((i) => (i - 1 + flatItems.length) % flatItems.length);
          break;
        case "Enter":
          e.preventDefault();
          flatItems[selectedIdx]?.action();
          break;
      }
    },
    [flatItems, selectedIdx],
  );


  /* ─── §4.13  Guard ───────────────────────────────────────── */

  if (!shouldRender) return null;


  /* ─── §4.14  Render ──────────────────────────────────────── */

  const placeholder = isFinanceRoute
    ? "Buscar finanzas, reportes, acciones..."
    : "Buscar eventos, familias, instalaciones...";

  return (
    <div
      data-testid="ui-cmd"
      className={cn("ui-cmd__overlay", isVisible && "ui-cmd__overlay--visible")}
      onClick={close}
    >
      {/* Backdrop */}
      <div className="ui-cmd__backdrop" aria-hidden="true" />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Búsqueda rápida"
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={cn("ui-cmd__panel", isVisible && "ui-cmd__panel--visible")}
      >
        {/* ── Search ── */}
        <div className="ui-cmd__search">
          <Search
            size={18}
            strokeWidth={1.5}
            className="ui-cmd__search-icon"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
            placeholder={placeholder}
            autoFocus
            className="ui-cmd__search-input"
          />
          {isSearching && (
            <div className="ui-cmd__spinner" role="status" aria-label="Buscando..." />
          )}
          <kbd className="ui-cmd__kbd ui-cmd__kbd--esc">ESC</kbd>
        </div>

        {/* ── Results ── */}
        <div className="ui-cmd__results">
          {groups.length === 0 ? (
            <div className="ui-cmd__empty">
              <p>Sin resultados para &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            groups.map(([category, items]) => (
              <div key={category} className="ui-cmd__group">
                <div className="ui-cmd__group-header">
                  <span className="ui-cmd__group-label">{category}</span>
                </div>
                {items.map((item) => {
                  const idx = itemIndexMap.get(item.id)!;
                  const isSelected = idx === selectedIdx;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIdx(idx)}
                      className={cn(
                        "ui-cmd__item",
                        isSelected && "ui-cmd__item--selected",
                      )}
                    >
                      <span className="ui-cmd__item-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <div className="ui-cmd__item-body">
                        <span className="ui-cmd__item-label">{item.label}</span>
                        {item.description && (
                          <span className="ui-cmd__item-desc">{item.description}</span>
                        )}
                      </div>
                      {isSelected && (
                        <ArrowRight size={14} className="ui-cmd__item-arrow" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* ── Footer ── */}
        <div className="ui-cmd__footer">
          <div className="ui-cmd__hints">
            <span className="ui-cmd__hint">
              <kbd className="ui-cmd__kbd">↑↓</kbd> navegar
            </span>
            <span className="ui-cmd__hint">
              <kbd className="ui-cmd__kbd">↵</kbd> seleccionar
            </span>
            <span className="ui-cmd__hint">
              <kbd className="ui-cmd__kbd">esc</kbd> cerrar
            </span>
          </div>
          <span className="ui-cmd__hint ui-cmd__hint--desktop">
            <kbd className="ui-cmd__kbd">?</kbd> ver todos los atajos
          </span>
        </div>
      </div>
    </div>
  );
}