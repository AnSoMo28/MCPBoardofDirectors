/**
 * @component OperationsDashboard (Fase 25 — REWRITE)
 * @namespace .glass-ops
 * @depends DetailTabs, PageContainer, OperationsDashboard.css
 * @note Hub with keep-alive tabs, route sync (useSearchParams),
 *       keyboard shortcuts (Alt+1/2/3), visited tracking with status dots,
 *       per-tab error boundary.
 *       Backward-compatible: same route, same tab structure.
 * @import import './OperationsDashboard.css';
 */

import {
  useState,
  useEffect,
  useCallback,
  lazy,
  Suspense,
  Component,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router";
import { Sunrise, ShieldCheck, CalendarClock } from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import {
  DetailTabs,
  type DetailTab,
} from "@/shared/components/layout/DetailTabs";
import { Skeleton } from "@/shared/components/ui";
import { cn } from "@/shared/lib/utils";
import "./OperationsDashboard.css";

/* ═══════════════════════════════════════
   Lazy Imports
   ═══════════════════════════════════════ */

const DailyBriefing = lazy(() => import("./components/DailyBriefing"));
const ComplianceCheck = lazy(() => import("./components/ComplianceCheck"));
const SmartSchedule = lazy(() => import("./components/SmartSchedule"));

/* ═══════════════════════════════════════
   Constants
   ═══════════════════════════════════════ */

const TABS: DetailTab[] = [
  { id: "briefing", label: "Briefing Diario", icon: Sunrise },
  { id: "compliance", label: "Cumplimiento", icon: ShieldCheck },
  { id: "schedule", label: "Horarios", icon: CalendarClock },
];

const VALID_TAB_IDS = new Set(TABS.map((t) => t.id));

const TAB_COMPONENTS: Record<
  string,
  React.LazyExoticComponent<React.ComponentType>
> = {
  briefing: DailyBriefing,
  compliance: ComplianceCheck,
  schedule: SmartSchedule,
};

const SHORTCUT_MAP: Record<string, string> = {
  "1": "briefing",
  "2": "compliance",
  "3": "schedule",
};

/* ═══════════════════════════════════════
   Tab Error Boundary
   ═══════════════════════════════════════ */

class TabGuard extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-ops__error" role="alert">
          <p>Error al cargar esta sección.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ═══════════════════════════════════════
   Tab Skeleton
   ═══════════════════════════════════════ */

function TabFallback() {
  return (
    <div className="glass-ops__fallback" aria-label="Cargando sección">
      <Skeleton className="h-8 w-64 rounded-lg" />
      <div className="glass-ops__fallback-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function OperationsDashboard() {
  /* ── Route sync (Prop 4) ── */
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") || "briefing";
  const activeTab = VALID_TAB_IDS.has(rawTab) ? rawTab : "briefing";

  const setActiveTab = useCallback(
    (tab: string) => {
      setSearchParams({ tab }, { replace: true });
    },
    [setSearchParams],
  );

  /* ── Visited tracking (Prop 1: Keep-Alive) ── */
  const [visited, setVisited] = useState<Set<string>>(
    () => new Set([activeTab]),
  );

  useEffect(() => {
    setVisited((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  /* ── Keyboard shortcuts (Prop 2) ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const tab = SHORTCUT_MAP[e.key];
      if (tab) {
        e.preventDefault();
        setActiveTab(tab);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setActiveTab]);

  return (
    <PageContainer
      title="Centro de Operaciones"
      subtitle="Briefing diario, cumplimiento regulatorio y optimización de horarios"
      breadcrumbs={[
        { label: "Dashboard", href: "/admin/dashboard" },
        {
          label: "Operaciones",
          href: "/operaciones/centro-operaciones",
        },
      ]}
    >
      {/* ── Tabs ── */}
      <DetailTabs
        tabs={TABS}
        active={activeTab}
        onChange={setActiveTab}
        ariaLabel="Secciones de operaciones"
      />

      {/* ── Tab status indicators (Prop 3) ── */}
      <div className="glass-ops__indicators" aria-hidden="true">
        {TABS.map((tab) => (
          <span
            key={tab.id}
            className={cn(
              "glass-ops__dot",
              visited.has(tab.id) && "glass-ops__dot--visited",
            )}
            title={`${tab.label}${visited.has(tab.id) ? ": visitado" : ": sin visitar"}`}
          />
        ))}
      </div>

      {/* ── Keep-alive panels (Prop 1) ── */}
      {TABS.filter((tab) => visited.has(tab.id)).map((tab) => {
        const TabComponent = TAB_COMPONENTS[tab.id];
        return (
          <div
            key={tab.id}
            className={cn(
              "glass-ops__panel",
              activeTab !== tab.id && "glass-ops__panel--hidden",
            )}
            role="tabpanel"
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            hidden={activeTab !== tab.id}
          >
            <TabGuard>
              <Suspense fallback={<TabFallback />}>
                <TabComponent />
              </Suspense>
            </TabGuard>
          </div>
        );
      })}
    </PageContainer>
  );
}

export default OperationsDashboard;