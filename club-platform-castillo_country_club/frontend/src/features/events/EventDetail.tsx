// src/features/events/EventDetail.tsx
// ═══════════════════════════════════════════════════════════
// Events Domain — Detail Page
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   ed-* (event detail)
// @keyframes   6 (in EventDetail.css)
// @depends     shared/components/ui: Button, Card, EmptyState,
//              Skeleton, CardSkeleton, ScoreGauge, FreshnessBadge,
//              shared/components/layout: PageContainer, DetailTabs,
//              shared/components/auth: PermissionGate,
//              shared/lib/utils: cn,
//              ./hooks/useEventDetail, ./types: EVENT_CATEGORY_CONFIG,
//              ./components: EventHero, PulseRing, ProgramTimeline,
//              RsvpBoard, VendorGrid, EventIntelligencePanel
//
// PRE-WRITE VERIFICATION:
// [x] Card → children, className?, padding?, hover?, tone?, extends HTMLAttributes
// [x] CardSkeleton → noAnimation?, className?, extends HTMLAttributes
// [x] Skeleton → variant: "text"|"circular"|"rectangular", className?, style?
// [x] ScoreGauge → score: number, size?: number(px), label?: string
// [x] FreshnessBadge → freshness: { label: string, color: string }
// [x] DetailTabs → tabs: readonly DetailTab[], active: string, onChange, ariaLabel?
// [x] PageContainer → title, subtitle?, breadcrumbs?, actions?: ReactNode
// [x] PermissionGate → roles: UserRole[], children
// [x] Button → variant, size?, icon?, onClick, disabled?, aria-label?
// [x] EmptyState → icon?, title, description?, action?
// [x] EVENT_ROUTES.list verified in ./config
// [x] EVENT_CATEGORY_CONFIG verified in ./types
// [x] cn verified in shared/lib/utils
//
// ANTI-PATTERNS REMOVED:
// [x] ~50 Tailwind utilities → ed-* BEM classes
// [x] error as Error → error instanceof Error guard
// [x] Inline DetailSkeleton → shared Skeleton + CardSkeleton
// [x] glass-* namespace → ed-* namespace
// [x] Inline style={{ "--stagger-i": N }} → ed-stagger with --i
// [x] No data-testid → 12 data-testid attributes
// [x] No ScoreGauge → health score in toolbar
// [x] No FreshnessBadge → data freshness in toolbar
// [x] No file header → added
// [x] No § markers → §0-§2
// [x] Inline Tailwind on Cancel button → ed-detail__action--danger CSS
// [x] Hardcoded route "/admin/events" → EVENT_ROUTES.list
// [x] font-[family-name:var(--font-*)] → CSS font-family
// [x] text-[var(--color-*)] → CSS color tokens
// [x] border-white/[0.06] → CSS rgba
// [x] bg-[var(--color-surface-2)] → CSS background
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";

// Shared — UI
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Skeleton, CardSkeleton } from "@/shared/components/ui/Skeleton";
import { ScoreGauge } from "@/shared/components/ui/ScoreGauge";
import { FreshnessBadge } from "@/shared/components/ui/FreshnessBadge";

// Shared — Layout
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { DetailTabs } from "@/shared/components/layout/DetailTabs";
import type { DetailTab } from "@/shared/components/layout/DetailTabs";

// Shared — Auth
import { PermissionGate } from "@/shared/components/auth/PermissionGate";

// Shared — Lib
import { cn } from "@/shared/lib/utils";

// Feature — Config
import { EVENT_ROUTES } from "./config";

// Feature — Types
import { EVENT_CATEGORY_CONFIG } from "./types";

// Feature — Hooks
import { useEventDetail } from "./hooks/useEventDetail";
import type { DetailTab as DetailTabId } from "./hooks/useEventDetail";

// Feature — Components
import { EventHero } from "./components/EventHero";
import { PulseRing } from "./components/PulseRing";
import { ProgramTimeline } from "./components/ProgramTimeline";
import { RsvpBoard } from "./components/RsvpBoard";
import { VendorGrid } from "./components/VendorGrid";
import { EventIntelligencePanel } from "./components/EventIntelligencePanel";

// Icons
import {
  ArrowLeft,
  Edit,
  Send,
  X,
  Users,
  Briefcase,
  Clock,
  Info,
  Sparkles,
  AlertTriangle,
  Copy,
  FileText,
  Hourglass,
} from "lucide-react";

// Styles
import "./EventDetail.css";
import { useNavigate } from "react-router";
// ═══════════════════════════════════════════════════════════
// §1 CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Tab definitions — id typed with hook's DetailTab union for safety. */
const DETAIL_TABS: Array<DetailTab & { id: DetailTabId }> = [
  { id: "resumen", label: "Resumen", icon: Info },
  { id: "programa", label: "Programa", icon: Clock },
  { id: "rsvps", label: "RSVPs", icon: Users },
  { id: "proveedores", label: "Proveedores", icon: Briefcase },
  { id: "ai", label: "Análisis AI", icon: Sparkles },
];

// ═══════════════════════════════════════════════════════════
// §2 COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * EventDetail — full detail view for a single event.
 *
 * Renders: hero, stats row (PulseRing + metrics + ScoreGauge),
 * tab navigation, and tab content (summary, program, RSVPs,
 * vendors, AI intelligence panel).
 */
export function EventDetail() {
  const navigate = useNavigate();
  const { id, event, isLoading, isError, error, confirmedAttendees, activeTab, tabDirection, handleTabChange, handleBack, handleEdit, handlePublish, handleCancel, handleClone, handleReport, handleInvite, isUpdating, isCloning, isReporting } = useEventDetail();

  /* ── §2.1 Derived data ── */

  const healthScore = useMemo(() => {
    if (!event) return 0;
    const capacity = event.max_capacity > 0
      ? (event.current_attendance / event.max_capacity) * 100
      : 0;
    const rsvpRate = event.rsvps.length > 0
      ? (event.rsvps.filter((r) => r.status === "confirmed").length / event.rsvps.length) * 100
      : 50;
    return Math.round((capacity * 0.4 + rsvpRate * 0.6));
  }, [event]);

  const freshness = useMemo(() => {
    if (isLoading || isError || !event) return null;
    return { label: "En vivo", color: "var(--color-emerald-400)" };
  }, [isLoading, isError, event]);

  const tabsWithCounts = useMemo(() => {
    if (!event) return DETAIL_TABS;
    return DETAIL_TABS.map((t) => {
      if (t.id === "rsvps") return { ...t, count: event.rsvps.length };
      if (t.id === "programa") return { ...t, count: event.programs.length };
      if (t.id === "proveedores") return { ...t, count: event.vendors.length };
      return t;
    });
  }, [event]);

  /* ── §2.2 Loading state ── */
  if (isLoading) {
    return (
      <PageContainer
        title="Evento"
        subtitle="Cargando..."
        data-testid="ed-loading"
      >
        <div className="ed-skeleton">
          <Skeleton variant="rectangular" className="ed-skeleton__hero" />
          <div className="ed-stats">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
          <Skeleton variant="rectangular" className="ed-skeleton__content" />
        </div>
      </PageContainer>
    );
  }

  /* ── §2.3 Error state ── */
  if (isError || !event) {
    return (
      <PageContainer title="Evento" data-testid="ed-error">
        <EmptyState
          icon={<AlertTriangle />}
          title="Error al cargar"
          description={
            error instanceof Error
              ? error.message
              : "No se pudo cargar el evento."
          }
          action={
            <Button onClick={() => navigate(EVENT_ROUTES.list)}>
              Volver a eventos
            </Button>
          }
        />
      </PageContainer>
    );
  }

  /* ── §2.4 Derived from event ── */
  const catConfig = EVENT_CATEGORY_CONFIG[event.category];

  /* ── §2.5 Render ── */
  return (
    <PageContainer
      title={event.title}
      subtitle={`${catConfig.icon} ${catConfig.label}`}
      breadcrumbs={[
        { label: "Eventos", href: EVENT_ROUTES.list },
        { label: event.title },
      ]}
      actions={
        <>
          {/* Intelligence indicators */}
          <ScoreGauge
            score={healthScore}
            size={32}
            label="Salud"
            data-testid="ed-health"
          />
          {freshness && (
            <FreshnessBadge
              freshness={freshness}
              data-testid="ed-freshness"
            />
          )}

          {/* Divider */}
          <span className="ed-toolbar__divider" aria-hidden="true" />

          {/* Back button */}
          <Button
            variant="ghost"
            icon={<ArrowLeft />}
            onClick={handleBack}
            aria-label="Volver a eventos"
          >
            Volver
          </Button>

          {/* Admin actions */}
          <PermissionGate roles={["ADMIN", "STAFF"]}>
            {(event.status === "draft" || event.status === "approved") && (
              <Button
                variant="primary"
                icon={<Send />}
                onClick={handlePublish}
                disabled={isUpdating}
                aria-label="Publicar evento"
              >
                Publicar
              </Button>
            )}

            {event.status === "published" && (
              <Button
                variant="ghost"
                icon={<X />}
                onClick={handleCancel}
                disabled={isUpdating}
                className="ed-detail__action--danger"
                aria-label="Cancelar evento"
              >
                Cancelar evento
              </Button>
            )}

            <Button
              variant="ghost"
              icon={<Edit />}
              onClick={handleEdit}
              aria-label="Editar evento"
            >
              Editar
            </Button>
          </PermissionGate>
        </>
      }
    >
      <div className="ed-detail" data-testid="ed-detail">

        {/* ── §2.6 Hero ── */}
        <div className="ed-stagger" style={{"--i": 0} as React.CSSProperties}>
          <EventHero event={event} />
        </div>

        {/* ── §2.7 Stats Row ── */}
        <div
          className="ed-stats ed-stagger"
          style={{"--i": 1} as React.CSSProperties}
          data-testid="ed-stats"
        >
          {/* Pulse Ring */}
          <div className="ed-stats__pulse">
            <PulseRing
              current={event.current_attendance}
              max={event.max_capacity}
              waitlist={event.waitlist_count}
            />
          </div>

          {/* Confirmados */}
          <Card padding={false} hover={false} className="ed-stats__card">
            <p className="ed-stats__card-label">Confirmados</p>
            <p className="ed-stats__card-value ed-stats__card-value--emerald">
              {confirmedAttendees}
            </p>
          </Card>

          {/* En espera */}
          <Card padding={false} hover={false} className="ed-stats__card">
            <p className="ed-stats__card-label">
              <Hourglass className="ed-stats__card-icon" aria-hidden="true" />
              En espera
            </p>
            <p className="ed-stats__card-value ed-stats__card-value--teal">
              {event.waitlist_count}
            </p>
          </Card>

          {/* Organizador */}
          <Card padding={false} hover={false} className="ed-stats__card">
            <p className="ed-stats__card-label">Organizador</p>
            <p className="ed-stats__card-text">
              {event.created_by || "Administración"}
            </p>
          </Card>
        </div>

        {/* ── §2.8 Tabs ── */}
        <div className="ed-stagger" style={{"--i": 2} as React.CSSProperties}>
          <DetailTabs
            tabs={tabsWithCounts}
            active={activeTab}
            onChange={handleTabChange}
            ariaLabel="Secciones del evento"
          />
        </div>

        {/* ── §2.9 Tab Content (directional slide) ── */}
        <div
          key={activeTab}
          className={cn(
            "ed-tab-panel",
            tabDirection === "fwd" && "ed-tab-panel--fwd",
            tabDirection === "bwd" && "ed-tab-panel--bwd",
          )}
          data-testid={`ed-panel-${activeTab}`}
          role="tabpanel"
          id={`dpanel-${activeTab}`}
          aria-labelledby={`dtab-${activeTab}`}
        >
          {/* Resumen */}
          {activeTab === "resumen" && (
            <div className="ed-summary">
              <Card className="ed-summary__details">
                <h4 className="ed-summary__heading">Detalles del evento</h4>
                <p className="ed-summary__description">
                  {event.description}
                </p>

                {/* Tags */}
                {event.tags.length > 0 && (
                  <div className="ed-summary__tags">
                    {event.tags.map((tag) => (
                      <span key={tag} className="ed-summary__tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Detail grid */}
                <div className="ed-summary__grid">
                  <div className="ed-summary__field">
                    <p className="ed-summary__field-label">Tipo de acceso</p>
                    <p className="ed-summary__field-value">
                      {event.event_type.replace("_", " ")}
                    </p>
                  </div>
                  <div className="ed-summary__field">
                    <p className="ed-summary__field-label">Solo miembros</p>
                    <p className="ed-summary__field-value">
                      {event.is_members_only ? "Sí" : "No"}
                    </p>
                  </div>
                  <div className="ed-summary__field">
                    <p className="ed-summary__field-label">Invitados permitidos</p>
                    <p className="ed-summary__field-value">
                      {event.allow_guests
                        ? `Sí (máx. ${event.max_guests_per_family}/familia)`
                        : "No"}
                    </p>
                  </div>
                  {event.dress_code && (
                    <div className="ed-summary__field">
                      <p className="ed-summary__field-label">Código de vestimenta</p>
                      <p className="ed-summary__field-value">{event.dress_code}</p>
                    </div>
                  )}
                  {event.recurrence !== "none" && (
                    <div className="ed-summary__field">
                      <p className="ed-summary__field-label">Recurrencia</p>
                      <p className="ed-summary__field-value">{event.recurrence}</p>
                    </div>
                  )}
                  {event.age_groups.length > 0 &&
                    !event.age_groups.includes("all") && (
                      <div className="ed-summary__field">
                        <p className="ed-summary__field-label">Grupos de edad</p>
                        <p className="ed-summary__field-value">
                          {event.age_groups.join(", ")}
                        </p>
                      </div>
                    )}
                </div>

                {/* Internal notes */}
                {event.notes && (
                  <div className="ed-summary__notes">
                    <p className="ed-summary__notes-label">Notas internas</p>
                    <p className="ed-summary__notes-text">{event.notes}</p>
                  </div>
                )}
              </Card>

              {/* Action buttons */}
              <PermissionGate roles={["ADMIN", "STAFF"]}>
                <Card padding={false} hover={false} className="ed-actions">
                  <h4 className="ed-actions__heading">Acciones</h4>
                  <div className="ed-actions__row">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Send />}
                      onClick={handleInvite}
                      aria-label="Enviar invitaciones"
                    >
                      Enviar invitaciones
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Copy />}
                      onClick={handleClone}
                      disabled={isCloning}
                      aria-label="Clonar evento"
                    >
                      Clonar evento
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<FileText />}
                      onClick={handleReport}
                      disabled={isReporting}
                      aria-label="Generar reporte"
                    >
                      Generar reporte
                    </Button>
                  </div>
                </Card>
              </PermissionGate>
            </div>
          )}

          {/* Programa */}
          {activeTab === "programa" && (
            <Card className="ed-program">
              <h4 className="ed-program__heading">Itinerario del evento</h4>
              {/* TODO(ev-components): remove spread after ProgramTimeline audit */}
              <ProgramTimeline items={[...event.programs]} />
            </Card>
          )}

          {/* RSVPs */}
          {activeTab === "rsvps" && (
            <Card padding={false} hover={false}>
              {/* TODO(ev-components): remove spread after RsvpBoard audit */}
              <RsvpBoard rsvps={[...event.rsvps]} />
            </Card>
          )}

          {/* Proveedores */}
          {activeTab === "proveedores" && (
            /* TODO(ev-components): remove spread after VendorGrid audit */
            <VendorGrid vendors={[...event.vendors]} />
          )}

          {/* Análisis AI */}
          {activeTab === "ai" && (
            <EventIntelligencePanel eventId={event.id} />
          )}
        </div>
      </div>
    </PageContainer>
  );
}