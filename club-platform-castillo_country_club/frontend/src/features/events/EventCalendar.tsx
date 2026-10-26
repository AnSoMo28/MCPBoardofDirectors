// src/features/events/EventCalendar.tsx
// ═══════════════════════════════════════════════════════════
// Events Domain — Calendar Page
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   ev-calendar
// @keyframes   6 (en EventCalendar.css · namespaced evCal*)
// @depends     shared/components/ui: Button, EmptyState, Skeleton,
//              ScoreGauge, FreshnessBadge, StaleDataBanner,
//              AdvisorActionModal,
//              shared/components/layout: PageContainer,
//              shared/components/auth: PermissionGate,
//              shared/hooks: useBreakpoint,
//              shared/types/ai-intelligence: AdvisorReaction,
//              ./config: EVENT_ROUTES,
//              ./hooks: useEventCalendar,
//              ./components: CalendarGrid, EventListView,
//              QuickAddPanel, EventAdvisorBanner
//
// PRE-WRITE VERIFICATION (contrato v2.1 auditado · G9):
// [x] useBreakpoint() → BreakpointState { isDesktop: boolean }
// [x] ScoreGauge → score: number, size: number (px), label?: string
// [x] FreshnessBadge → freshness: { label: string, color: string }
// [x] StaleDataBanner → age?: string, onRefresh?: () => void | Promise
// [x] Skeleton → variant: "text"|"circular"|"rectangular", style
// [x] PageContainer → actions: ReactNode | PageAction[]
// [x] PermissionGate → roles: UserRole[], children
// [x] Button → variant, size, icon, onClick, aria-label
// [x] EmptyState → icon, title, description, action
// [x] AdvisorActionModal → isOpen, onClose, onConfirm, action,
//      insightTitle, insightReasoning, executionState
// [x] EVENT_ROUTES.create verificado en ./config
//
// AUDIT v2.0 — 3 FASES (Senior Expert · G10 · J-10 finalización):
// [x] F-01 L175-182 `monthInsights` memoizado y JAMÁS consumido →
//     TS6133 bajo noUnusedLocals (CI rojo) + trabajo muerto por
//     render. Eliminado (CalendarGrid no expone prop de insights).
// [x] F-02 L76 import `cn` muerto (0 usos en el archivo) → TS6133.
//     Eliminado; @depends actualizado a la verdad.
// [x] F-03 L230/L270/L358 `as React.CSSProperties` ×3 sin namespace
//     React en scope (misma familia que G9-11/Skeleton) →
//     `type CSSProperties` + helper staggerStyle() tipado único.
// [x] F-04 L246-252 StaleDataBanner visible SIEMPRE que hay datos →
//     useStaleness(): timestamp del último éxito + ticker 60 s +
//     umbral 5 min + markFresh() tras refrescar (sin bucle).
// [x] F-05 5 arrays nuevos por render ([...]×4 + filter inline) →
//     useMemo con deps estables: el React.memo de los hijos vuelve
//     a operar y el filtro solo corre cuando cambia su input.
// [x] F-06 WCAG 2.5.3 Label-in-Name: botón "Hoy" con aria-label
//     ("Ir al mes actual") que NO contiene la etiqueta visible →
//     eliminado; el texto visible ES el nombre accesible.
// [x] F-07 L238 cast doble `as unknown as` inline → adaptador único
//     adaptReactions(): acotado, nombrado y con plan de retiro.
// [x] F-08 L101-102 import de tipo tras el side-effect CSS →
//     orden restaurado (tipos agrupados, CSS al final).
// [x] F-09 magic numbers 85/15/20 → constantes HEALTH_* nombradas
//     y documentadas; Math.min(100,…) muerto eliminado.
// [x] F-10 MONTH_NAMES hardcodeado → Intl.DateTimeFormat("es")
//     (locale-aware, cero mantenimiento, i18n-ready).
// [x] F-11 "1 eventos" → pluralización es-AR correcta.
// [x] F-12 React 19: useTransition + aria-busy + data-view-pending
//     en el cambio de vista; mes anunciado con aria-live="polite".
// [x] F-13 L397-401 indentación del bloque CalendarGrid normalizada.
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { useNavigate } from "react-router";

// Shared — UI
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { ScoreGauge } from "@/shared/components/ui/ScoreGauge";
import { FreshnessBadge } from "@/shared/components/ui/FreshnessBadge";
import { StaleDataBanner } from "@/shared/components/ui/StaleDataBanner";
import { AdvisorActionModal } from "@/shared/components/ui/AdvisorActionModal";

// Shared — Layout
import { PageContainer } from "@/shared/components/layout/PageContainer";

// Shared — Auth
import { PermissionGate } from "@/shared/components/auth/PermissionGate";

// Shared — Hooks
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";

// Shared — Types
import type { AdvisorReaction } from "@/shared/types/ai-intelligence";

// Feature — Config
import { EVENT_ROUTES } from "./config";

// Feature — Hooks
import { useEventCalendar } from "./hooks/useEventCalendar";

// Feature — Components
import { CalendarGrid } from "./components/CalendarGrid";
import { EventListView } from "./components/EventListView";
import { QuickAddPanel } from "./components/QuickAddPanel";
import { EventAdvisorBanner } from "./components/EventAdvisorBanner";

// Icons
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  Plus,
  AlertTriangle,
} from "lucide-react";

// Styles — side-effect siempre al final
import "./EventCalendar.css";

// ═══════════════════════════════════════════════════════════
// §1 CONSTANTES, HELPERS Y ADAPTADORES
// ═══════════════════════════════════════════════════════════

/** Breadcrumbs de la página de calendario. */
const BREADCRUMBS = [{ label: "Eventos" }] as const;

/* Antigüedad de datos — política de staleness local ─────────── */

/** Umbral a partir del cual los datos se consideran desactualizados. */
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

/** Reevaluación de antigüedad (1 interval de 60 s — barato). */
const FRESHNESS_TICK_MS = 60 * 1000;

/* Health score del dominio — semántica documentada (F-09) ───── */

/** Score cuando el advisor aún no emitió insights (estado neutro). */
const HEALTH_BASE_NO_INSIGHTS = 85;

/** Penalización por cada insight de impacto "high". */
const HEALTH_PENALTY_PER_HIGH = 15;

/** Piso del score — coincide con el umbral crítico de ScoreGauge. */
const HEALTH_MIN = 20;

/* i18n — meses vía Intl, cero mantenimiento (F-10) ──────────── */

/** Formateador de meses en español, cacheado a nivel de módulo. */
const monthFormatter = new Intl.DateTimeFormat("es", { month: "long" });

/**
 * Nombre del mes capitalizado ("Septiembre", no "septiembre").
 * i18n note: cuando el framework de i18n esté cableado, migrar a
 * i18n.t(`calendar.month.${index}`) sin tocar los call sites.
 */
function formatMonthName(monthIndex: number): string {
  const name = monthFormatter.format(new Date(2027, monthIndex, 1));
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Helper de stagger tipado (F-03) — reemplaza los tres casts sueltos
 * `{"--i": n} as React.CSSProperties` por una única fuente de verdad.
 */
const staggerStyle = (i: number): CSSProperties =>
  ({ "--i": i }) as CSSProperties;

/**
 * ADAPTADOR — deuda tipada (F-07): useEventCalendar expone `reactions`
 * con el tipo del dominio (AdvisorReactionInsight[]) mientras
 * EventAdvisorBanner espera `readonly AdvisorReaction[]`. El cast vive
 * ÚNICAMENTE aquí: acotado, nombrado y auditable. Al unificar ambos
 * tipos en shared/types/ai-intelligence este adaptador se elimina sin
 * tocar una sola línea de JSX.
 */
const adaptReactions = (
  reactions: readonly unknown[],
): readonly AdvisorReaction[] => reactions as readonly AdvisorReaction[];

// ═══════════════════════════════════════════════════════════
// §2 HOOK LOCAL — ANTIGÜEDAD REAL DE LOS DATOS
// ═══════════════════════════════════════════════════════════

/**
 * useStaleness — mide la antigüedad del último fetch exitoso (F-04).
 *
 * Contexto: useEventCalendar aún no expone `dataUpdatedAt`
 * (TanStack Query v5). Hasta entonces, este hook sella el instante
 * en que los datos pasan a estar listos y reevalúa cada
 * FRESHNESS_TICK_MS. Devuelve `ageLabel: null` mientras los datos
 * son frescos (o no hay datos) y una etiqueta humanizada
 * ("hace 12 min") al superarse STALE_THRESHOLD_MS.
 *
 * `markFresh()` se invoca tras un refresh explícito: un refetch que
 * devuelve datos idénticos (structural sharing preserva la identidad)
 * igualmente actualiza la moneda de los datos — staleness mide "hace
 * cuánto verificamos", no "hace cuánto cambió".
 *
 * TODO: al exponerse dataUpdatedAt, migrar este hook a
 * shared/hooks y reutilizarlo en todos los dominios.
 */
function useStaleness(
  isSuccess: boolean,
  dataSource: unknown,
): { ageLabel: string | null; markFresh: () => void } {
  const lastSuccessRef = useRef<number | null>(null);
  const [, tick] = useState(0);

  // Sella el timestamp en cada transición a éxito y cada vez que la
  // identidad de los datos cambia (refetch de fondo incluido).
  useEffect(() => {
    if (isSuccess) lastSuccessRef.current = Date.now();
  }, [isSuccess, dataSource]);

  // Ticker: reevalúa la antigüedad aunque no haya renders.
  useEffect(() => {
    const id = window.setInterval(
      () => tick((n) => n + 1),
      FRESHNESS_TICK_MS,
    );
    return () => window.clearInterval(id);
  }, []);

  /** Resella la moneda tras un refresh explícito del usuario. */
  const markFresh = useCallback(() => {
    lastSuccessRef.current = Date.now();
    tick((n) => n + 1);
  }, []);

  const last = lastSuccessRef.current;
  if (last === null) return { ageLabel: null, markFresh };

  const ageMs = Date.now() - last;
  if (ageMs < STALE_THRESHOLD_MS) return { ageLabel: null, markFresh };

  const minutes = Math.floor(ageMs / 60_000);
  const label =
    minutes < 60
      ? `hace ${minutes} min`
      : `hace ${Math.floor(minutes / 60)} h`;
  return { ageLabel: label, markFresh };
}

// ═══════════════════════════════════════════════════════════
// §3 COMPONENTE
// ═══════════════════════════════════════════════════════════

/**
 * EventCalendar — vista principal de calendario del dominio Events.
 *
 * Renderiza: banner del advisor, gauge de salud del dominio, badge
 * de frescura de datos, toolbar con navegación mensual + toggle de
 * vista, contenido calendario/lista, panel quick-add deslizante y
 * modal de acción del advisor (HITL).
 */
export function EventCalendar() {
  const navigate = useNavigate();
  const { isDesktop } = useBreakpoint();
  const [isViewPending, startViewTransition] = useTransition();

  const {
    // View state
    viewMode,
    setViewMode,
    currentYear,
    currentMonth,
    quickAddDate,
    setQuickAddDate,
    // Data
    calendarData,
    calendarGrid,
    allEvents,
    totalEvents,
    isLoading,
    isError,
    error,
    refetch,
    // Navigation
    handlePrevMonth,
    handleNextMonth,
    handleToday,
    handleEventClick,
    handleDayClick,
    handleNavigateToDate,
    handleNavigateToEvent,
    // Quick-Add
    handleQuickAddFullForm,
    handleCreateDraft,
    // Advisor
    advisorInsights,
    actionStates,
    reactions,
    handleAdvisorExecute,
    modalInsight,
    setModalInsight,
    handleModalConfirm,
  } = useEventCalendar();

  /* ── §3.1 Datos derivados ── */

  /**
   * Health score del dominio, derivado de la severidad de los
   * insights del advisor.
   * TODO: reemplazar por useEventAdvisor().healthScore cuando el
   * hook lo exponga.
   */
  const healthScore = useMemo(() => {
    if (advisorInsights.length === 0) return HEALTH_BASE_NO_INSIGHTS;
    const highCount = advisorInsights.filter(
      (i) => i.impact === "high",
    ).length;
    return Math.max(HEALTH_MIN, 100 - highCount * HEALTH_PENALTY_PER_HIGH);
  }, [advisorInsights]);

  /**
   * Frescura de datos para el badge de recencia.
   * TODO: reemplazar el label estático "En vivo" por la antigüedad
   * real cuando useEventCalendar exponga dataUpdatedAt.
   */
  const freshness = useMemo(() => {
    if (isLoading || isError) return null;
    return { label: "En vivo", color: "var(--color-emerald-400)" };
  }, [isLoading, isError]);

  /* ── §3.2 Referencias estables para hijos memoizados (F-05) ── */
  /* Los spreads existen porque los props de los hijos esperan
     arrays mutables; al memoizarlos la identidad solo cambia cuando
     cambia la fuente — el React.memo de los hijos vuelve a operar. */

  const bannerInsights = useMemo(
    () => [...advisorInsights],
    [advisorInsights],
  );
  const bannerReactions = useMemo(
    () => adaptReactions(reactions),
    [reactions],
  );
  const gridDays = useMemo(() => [...calendarGrid], [calendarGrid]);
  const eventsContext = useMemo(
    () => (calendarData ? [...calendarData] : null),
    [calendarData],
  );
  const quickAddDayEvents = useMemo(
    () =>
      allEvents.filter((e) => e.date_start.split("T")[0] === quickAddDate),
    [allEvents, quickAddDate],
  );

  /* ── §3.3 Antigüedad real (F-04) ── */

  const isDataReady = !isLoading && !isError && calendarData.length > 0;
  const { ageLabel: staleness, markFresh } = useStaleness(
    isDataReady,
    calendarData,
  );

  /** Refresh desde el banner: marca la moneda una vez resuelto. */
  const handleStaleRefresh = useCallback(async () => {
    try {
      await refetch();
    } finally {
      markFresh();
    }
  }, [refetch, markFresh]);

  /* ── §3.4 Transiciones no urgentes — React 19 (F-12) ── */
  /* El cambio de vista re-renderiza la grilla completa; marcarlo
     como transición mantiene el toggle responsivo y el contenido
     se confirma sin bloquear el hilo principal. */

  const selectViewMode = (mode: Parameters<typeof setViewMode>[0]) => {
    startViewTransition(() => setViewMode(mode));
  };

  /* ── §3.5 Render ── */

  return (
    <PageContainer
      title="Eventos"
      subtitle={`${totalEvents} ${totalEvents === 1 ? "evento" : "eventos"} en ${formatMonthName(currentMonth)} ${currentYear}`}
      breadcrumbs={BREADCRUMBS}
      actions={
        <PermissionGate roles={["ADMIN", "STAFF"]}>
          <Button
            variant="primary"
            icon={<Plus />}
            onClick={() => navigate(EVENT_ROUTES.create)}
            aria-label="Crear nuevo evento"
            data-testid="ev-cal-create-btn"
          >
            Nuevo evento
          </Button>
        </PermissionGate>
      }
    >
      <div className="ev-calendar" data-testid="ev-calendar">

        {/* ── §3.6 Banner del Advisor (slot oculto en print) ── */}
        <div
          className="ev-calendar__banner-slot ev-calendar__stagger"
          style={staggerStyle(0)}
        >
          <EventAdvisorBanner
            insights={bannerInsights}
            onNavigateToDate={handleNavigateToDate}
            onNavigateToEvent={handleNavigateToEvent}
            onExecute={handleAdvisorExecute}
            actionStates={actionStates}
            reactions={bannerReactions}
            eventsContext={eventsContext}
          />
        </div>

        {/* ── §3.7 Datos desactualizados — solo cuando es verdad ── */}
        {isDataReady && staleness !== null && (
          <StaleDataBanner
            age={staleness}
            onRefresh={handleStaleRefresh}
            message="Los datos podrían no reflejar cambios recientes."
            data-testid="ev-cal-stale"
          />
        )}

        {/* ── §3.8 Modal de acción del Advisor (HITL) ── */}
        {modalInsight?.action && (
          <AdvisorActionModal
            isOpen={!!modalInsight}
            onClose={() => setModalInsight(null)}
            onConfirm={handleModalConfirm}
            action={modalInsight.action}
            insightTitle={modalInsight.title}
            insightReasoning={modalInsight.reasoning}
            executionState={actionStates[modalInsight.id] ?? "idle"}
          />
        )}

        {/* ── §3.9 Toolbar ── */}
        <div
          className="ev-calendar__toolbar ev-calendar__stagger"
          style={staggerStyle(1)}
          data-testid="ev-cal-toolbar"
        >
          <div className="ev-calendar__nav">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
              icon={<ChevronLeft />}
              aria-label="Mes anterior"
              className="ev-calendar__nav-btn"
            />
            {/* F-06: sin aria-label — "Hoy" es el nombre accesible */}
            <Button variant="secondary" size="sm" onClick={handleToday}>
              Hoy
            </Button>
            <h2
              className="ev-calendar__month-title"
              aria-live="polite"
              aria-atomic="true"
            >
              {formatMonthName(currentMonth)} {currentYear}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              icon={<ChevronRight />}
              aria-label="Mes siguiente"
              className="ev-calendar__nav-btn"
            />
          </div>

          <div className="ev-calendar__toolbar-right">
            {/* Health Score del dominio */}
            <ScoreGauge
              score={healthScore}
              size={40}
              label="Salud"
              data-testid="ev-cal-health"
            />

            {/* Frescura de datos */}
            {freshness && (
              <FreshnessBadge
                freshness={freshness}
                data-testid="ev-cal-freshness"
              />
            )}

            {/* Toggle de vista — segmented control (F-12) */}
            <div
              className="ev-calendar__view-toggle"
              role="group"
              aria-label="Modo de vista"
            >
              <Button
                variant={viewMode === "calendar" ? "primary" : "ghost"}
                size="sm"
                onClick={() => selectViewMode("calendar")}
                icon={<CalendarDays />}
                aria-label="Vista calendario"
                aria-pressed={viewMode === "calendar"}
                className="ev-calendar__view-btn"
              />
              <Button
                variant={viewMode === "list" ? "primary" : "ghost"}
                size="sm"
                onClick={() => selectViewMode("list")}
                icon={<List />}
                aria-label="Vista lista"
                aria-pressed={viewMode === "list"}
                className="ev-calendar__view-btn"
              />
            </div>
          </div>
        </div>

        {/* ── §3.10 Hint ── */}
        {viewMode === "calendar" && !isLoading && !isError && (
          <p className="ev-calendar__hint" data-testid="ev-cal-hint">
            Hacé clic en un día para ver inteligencia del día y agregar eventos
          </p>
        )}

        {/* ── §3.11 Contenido ── */}
        <div
          className="ev-calendar__stagger"
          style={staggerStyle(2)}
          data-testid="ev-cal-content"
          data-view-pending={isViewPending ? "true" : undefined}
          aria-busy={isViewPending}
        >
          {isLoading ? (
            <div className="ev-calendar__skeleton">
              <Skeleton
                variant="rectangular"
                style={{
                  width: "100%",
                  height: isDesktop ? 600 : 400,
                  borderRadius: "var(--radius-lg)",
                }}
                data-testid="ev-cal-skeleton"
              />
            </div>
          ) : isError ? (
            <EmptyState
              icon={<AlertTriangle />}
              title="Error al cargar eventos"
              description={
                error instanceof Error
                  ? error.message
                  : "Intentá de nuevo más tarde."
              }
              action={
                <Button
                  onClick={() => refetch()}
                  aria-label="Reintentar carga de eventos"
                >
                  Reintentar
                </Button>
              }
              data-testid="ev-cal-error"
            />
          ) : viewMode === "calendar" ? (
            <div
              className="ev-calendar__grid-wrapper"
              data-testid="ev-cal-grid"
            >
              <CalendarGrid
                days={gridDays}
                onDayClick={handleDayClick}
                onEventClick={handleEventClick}
              />
            </div>
          ) : (
            <div data-testid="ev-cal-list">
              <EventListView
                events={allEvents}
                onEventClick={handleEventClick}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── §3.12 Panel Quick-Add ── */}
      <QuickAddPanel
        date={quickAddDate ?? ""}
        dayEvents={quickAddDayEvents}
        isOpen={quickAddDate !== null}
        onClose={() => setQuickAddDate(null)}
        onFullForm={handleQuickAddFullForm}
        onCreateDraft={handleCreateDraft}
        data-testid="ev-cal-quickadd"
      />
    </PageContainer>
  );
}
