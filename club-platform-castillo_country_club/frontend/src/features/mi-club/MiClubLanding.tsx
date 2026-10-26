/**
 * @component MiClubLanding (Fase 25 — REWRITE)
 * @namespace .glass-landing
 * @depends useMiClubLanding, ContextualBrief, AgentConstellation,
 *          PredictiveActions, StatPill, EventCard, RecommendationPreview,
 *          FamilyStream, ClubPulse, ConversationalSeed, QuickLink,
 *          MiClubLanding.css
 * @note Full rewrite from 500-line monolith to adaptive orchestrator.
 *       Sections reorder based on urgency. AI narrative brief replaces
 *       static greeting. Agent constellation shows system awareness.
 *       Backward-compatible: same default export, same route.
 * @import import './MiClubLanding.css';
 */

import { motion } from "framer-motion";
import {
  Users,
  CalendarDays,
  CreditCard,
  Star,
} from "lucide-react";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { formatCurrency } from "@/shared/lib/utils";
import { EmptyState, Skeleton } from "@/shared/components/ui";
import { SectionError } from "@/shared/components/layout/SectionError";
import { QUICK_LINKS } from "./config";
import { useMiClubLanding } from "./hooks/useMiClubLanding";
import { ContextualBrief } from "./components/ContextualBrief";
import { AgentConstellation } from "./components/AgentConstellation";
import { PredictiveActions } from "./components/PredictiveActions";
import { StatPill } from "./components/StatPill";
import { EventCard } from "./components/EventCard";
import { RecommendationPreview } from "./components/RecommendationPreview";
import { FamilyStream } from "./components/FamilyStream";
import { ClubPulse } from "./components/ClubPulse";
import { ConversationalSeed } from "./components/ConversationalSeed";
import { QuickLink } from "./components/QuickLink";
import "./MiClubLanding.css";

/* ═══════════════════════════════════════
   Loading Skeleton
   ═══════════════════════════════════════ */

function LandingSkeleton() {
  return (
    <div className="glass-landing__skeleton">
      <div className="glass-landing__skeleton-brief">
        <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <div className="glass-landing__skeleton-constellation">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <Skeleton className="w-2 h-2 rounded-full" />
            <Skeleton className="h-2 w-10" />
          </div>
        ))}
      </div>
      <div className="glass-landing__stats">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-[12px]" />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Section Render Map
   ═══════════════════════════════════════ */

function useRenderMap(h: ReturnType<typeof useMiClubLanding>) {
  return {
    brief: (
      <ContextualBrief
        segments={h.contextualBrief}
        avatarInitials={h.avatarInitials}
        engagementScore={h.family?.engagementScore ?? null}
      />
    ),
    predictive: h.predictiveActions.length > 0 ? (
      <PredictiveActions actions={h.predictiveActions} />
    ) : null,
    stats: (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="glass-landing__stats"
      >
        <StatPill
          icon={<Users size={16} />}
          value={h.family?.memberCount ?? "—"}
          label="Miembros"
          color="var(--color-gold-400)"
        />
        <StatPill
          icon={<CalendarDays size={16} />}
          value={h.upcomingEvents.length}
          label="Próximos eventos"
          color="var(--color-teal-400)"
        />
        <StatPill
          icon={<CreditCard size={16} />}
          value={h.family ? formatCurrency(h.family.totalBalance) : "—"}
          label="Saldo"
          color={
            h.family && h.family.totalBalance < 0
              ? "var(--color-rose-400)"
              : "var(--color-emerald-400)"
          }
        />
        <StatPill
          icon={<Star size={16} />}
          value={
            h.family?.tier
              ? h.family.tier.charAt(0).toUpperCase() +
                h.family.tier.slice(1)
              : "—"
          }
          label="Nivel"
          color="var(--color-amber-400)"
        />
      </motion.div>
    ),
    events: (
      <div>
        <div className="glass-landing__events-header">
          <h2 className="glass-landing__events-title">
            Próximos eventos
          </h2>
        </div>
        {h.eventsError ? (
          <SectionError
            title="No se pudieron cargar los eventos"
            onRetry={h.refetchEvents}
          />
        ) : h.upcomingEvents.length > 0 ? (
          <div className="glass-landing__events-grid">
            {h.upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : !h.eventsLoading ? (
          <EmptyState
            title="Sin eventos próximos"
            description="No hay eventos programados. Explorá el calendario."
            icon={<CalendarDays className="w-8 h-8" />}
          />
        ) : null}
      </div>
    ),
    recommendations: (
      <RecommendationPreview
        showTrigger={!h.showRecommendations}
        onLoad={() => h.setShowRecommendations(true)}
        isLoading={h.recsLoading}
        isError={h.recsError}
        onRetry={h.refetchRecs}
        recommendations={h.recommendations}
      />
    ),
    stream: <FamilyStream items={h.familyStreamItems} />,
    pulse: <ClubPulse data={h.clubPulse} />,
    seed: <ConversationalSeed seeds={h.conversationalSeeds} />,
    links: (
      <div>
        <h2 className="glass-landing__links-header">
          Accesos rápidos
        </h2>
        <div className="glass-landing__links-grid">
          {QUICK_LINKS.map((link) => (
            <QuickLink
              key={link.route}
              icon={link.icon}
              label={link.label}
              description={link.description}
              route={link.route}
              color={link.color}
            />
          ))}
        </div>
      </div>
    ),
  } as const;
}

/* ═══════════════════════════════════════
   Main Component
   ═══════════════════════════════════════ */

export function MiClubLanding() {
  const h = useMiClubLanding();
  useReducedMotion();

  /* ── Loading ── */
  if (h.isLoading && !h.family) {
    return <LandingSkeleton />;
  }

  /* ── Error ── */
  if (h.familyError) {
    return (
      <div style={{ maxWidth: "56rem" }}>
        <SectionError
          title="No se pudo cargar tu información"
          description="Ocurrió un error al obtener los datos de tu familia."
          onRetry={h.refetchFamily}
        />
      </div>
    );
  }

  /* ── Render sections in adaptive order ── */
  const sections = useRenderMap(h);

  return (
    <main className="glass-landing" role="main" aria-label="Panel personal del socio">
      <AgentConstellation agents={h.agentActivity} />

      {h.sectionOrder.map((sectionId) => {
        const content = sections[sectionId];
        if (!content) return null;
        return (
          <section key={sectionId} aria-label={sectionId}>
            {content}
          </section>
        );
      })}
    </main>
  );
}

export default MiClubLanding;