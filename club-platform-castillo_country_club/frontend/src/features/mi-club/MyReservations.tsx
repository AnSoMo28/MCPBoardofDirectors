/**
 * @component MyReservations (Fase 25 — REWRITE)
 * @namespace .glass-reservations
 * @depends useMyReservations, TodayHero, ReservationCard,
 *          RebookSuggestion, MyReservations.css
 * @note Socio reservations with today hero + countdown + timeline,
 *       smart rebook suggestions, filter tabs.
 *       Backward-compatible: same default export, same route.
 * @import import './reservations/MyReservations.css';
 */

import { motion } from "framer-motion";
import {
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { EmptyState, Button, CardSkeleton } from "@/shared/components/ui";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useMyReservations } from "./hooks/useMyReservations";
import type { StatusFilter } from "./hooks/useMyReservations";
import { TodayHero } from "./reservations/TodayHero";
import { ReservationCard } from "./reservations/ReservationCard";
import { RebookSuggestion } from "./reservations/RebookSuggestion";
import "./reservations/MyReservations.css";

/* ═══════════════════════════════════════
   Filter Tabs
   ═══════════════════════════════════════ */

function FilterTabs({
  active,
  onChange,
  upcomingCount,
  totalCount,
}: {
  active: StatusFilter;
  onChange: (f: StatusFilter) => void;
  upcomingCount: number;
  totalCount: number;
}) {
  const tabs = [
    { key: "upcoming" as StatusFilter, label: "Próximas", count: upcomingCount },
    { key: "all" as StatusFilter, label: "Todas", count: totalCount },
  ];

  return (
    <div
      className="glass-reservations__filters"
      role="group"
      aria-label="Filtrar reservas"
    >
      {tabs.map((tab) => (
        <Button
          variant="unstyled"
          key={tab.key}
          type="button"
          aria-pressed={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "glass-reservations__filter-btn",
            active === tab.key &&
              "glass-reservations__filter-btn--active",
          )}
        >
          {tab.label}
          <span
            className={cn(
              "glass-reservations__filter-count",
              active !== tab.key &&
                "glass-reservations__filter-count--inactive",
            )}
            style={
              active === tab.key
                ? {
                    backgroundColor:
                      "color-mix(in srgb, var(--color-abyss) 20%, transparent)",
                    color: "var(--color-abyss)",
                  }
                : undefined
            }
          >
            {tab.count}
          </span>
        </Button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   Main Component
   ═══════════════════════════════════════ */

export function MyReservations() {
  const h = useMyReservations();
  const reducedMotion = useReducedMotion();

  return (
    <PageContainer
      title="Mis Reservas"
      breadcrumbs={[
        { label: "Mi Club", href: "/mi-club" },
        { label: "Mis Reservas" },
      ]}
      subtitle={
        h.upcomingCount > 0
          ? `${h.upcomingCount} reserva${h.upcomingCount !== 1 ? "s" : ""} próxima${h.upcomingCount !== 1 ? "s" : ""}`
          : "Sin reservas próximas"
      }
    >
      <main
        className="glass-reservations"
        role="main"
        aria-label="Tus reservas"
      >
        {/* ═══ Today Hero ═══ */}
        {h.hasTodayReservation && h.dayTimeline && (
          <motion.div
            initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.4 }}
          >
            <TodayHero
              reservations={h.todayReservations}
              countdown={h.countdown}
              nextReservation={h.nextReservation}
              dayTimeline={h.dayTimeline}
            />
          </motion.div>
        )}

        {/* ═══ Filter Tabs ═══ */}
        <FilterTabs
          active={h.statusFilter}
          onChange={h.setStatusFilter}
          upcomingCount={h.upcomingCount}
          totalCount={h.reservations.length}
        />

        {/* ═══ Content ═══ */}
        {h.isLoading ? (
          <div className="glass-reservations__skeleton">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : h.error ? (
          <EmptyState
            icon={
              <AlertTriangle className="w-8 h-8 text-[var(--color-rose-400)]" />
            }
            title="Error al cargar reservas"
            description="No se pudieron obtener tus reservas. Intentá de nuevo."
            action={
              <Button
                variant="secondary"
                onClick={h.refetch}
                icon={<AlertTriangle className="w-4 h-4" />}
              >
                Reintentar
              </Button>
            }
          />
        ) : h.filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <EmptyState
              icon={<MapPin className="w-12 h-12" />}
              title={
                h.statusFilter === "upcoming"
                  ? "Sin reservas próximas"
                  : "Sin reservas registradas"
              }
              description={
                h.statusFilter === "upcoming"
                  ? "No tenés reservas activas. Explorá las instalaciones del club."
                  : "Aún no realizaste reservas en el club."
              }
            />

            {/* Smart suggestion even when empty */}
            {h.rebookSuggestion && (
              <RebookSuggestion suggestion={h.rebookSuggestion} />
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {h.filtered.map((reservation, index) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                index={index}
              />
            ))}
          </div>
        )}
      </main>
    </PageContainer>
  );
}

export default MyReservations;