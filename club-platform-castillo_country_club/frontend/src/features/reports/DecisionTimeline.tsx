/**
 * @component DecisionTimeline (Fase 25 — REWRITE)
 * @namespace .glass-timeline
 * @depends useDecisionTimeline, DecisionTimelineEntry, TimelineStats,
 *          TimelineFilters, DecisionTimeline.css
 * @note Full rewrite from 220-line monolith to orchestrator with 2 sub-components.
 *       Complete filtering (outcome + domain + time range), accuracy ring gauge,
 *       staggered entry animation, CSS co-locado.
 *       Backward-compatible: same import path.
 * @import import './DecisionTimeline.css';
 */

import { useMemo } from "react";
import { motion, type Variants } from "framer-motion";
import { Clock, ChevronDown, ChevronUp } from "lucide-react";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useDecisionTimeline } from "./hooks/useDecisionTimeline";
import { DecisionTimelineEntry } from "./DecisionTimelineEntry";
import { TimelineStats } from "./timeline/TimelineStats";
import { TimelineFilters } from "./timeline/TimelineFilters";
import "./DecisionTimeline.css";
import { Button } from "@/shared/components/ui/Button";

/* ═══════════════════════════════════════
   EASE constant (avoids TS inference issue)
   ═══════════════════════════════════════ */

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function DecisionTimeline() {
  const tl = useDecisionTimeline();
  const reduced = useReducedMotion();

  /* ── Motion variants ── */
  const stagger: Variants = useMemo(
    () => ({
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: reduced ? 0 : 0.06 },
      },
    }),
    [reduced],
  );

  const fadeUp: Variants = useMemo(
    () => ({
      hidden: { opacity: 0, y: reduced ? 0 : 12 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: reduced ? 0 : 0.3, ease: EASE },
      },
    }),
    [reduced],
  );

  /* ── Empty state ── */
  if (tl.entries.length === 0) {
    return (
      <div className="glass-timeline__empty">
        <EmptyState
          icon={<Clock size={40} strokeWidth={1} />}
          title="Sin decisiones registradas"
          description="Las decisiones del Advisor aparecerán aquí cuando se ejecuten acciones desde los banners de inteligencia."
        />
      </div>
    );
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      {/* ── Stats ── */}
      <TimelineStats stats={tl.stats} fadeIn={fadeUp} />

      {/* ── Filters ── */}
      <motion.div variants={fadeUp}>
        <TimelineFilters
          outcomeFilter={tl.outcomeFilter}
          setOutcomeFilter={tl.setOutcomeFilter}
          domainFilter={tl.domainFilter}
          setDomainFilter={tl.setDomainFilter}
          availableDomains={tl.availableDomains}
          timeRange={tl.timeRange}
          setTimeRange={tl.setTimeRange}
        />
      </motion.div>

      {/* ── Timeline list ── */}
      <motion.div variants={fadeUp}>
        <div className="glass-timeline__list">
          {tl.displayEntries.map((entry, i) => (
            <div
              key={entry.id}
              className="glass-timeline__entry-enter"
              style={
                reduced
                  ? undefined
                  : { animationDelay: `${i * 60}ms` }
              }
            >
              <DecisionTimelineEntry
                entry={entry}
                isLast={i === tl.displayEntries.length - 1 && !tl.hasMore}
              />
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Load more ── */}
      {tl.hasMore && !tl.showAll && (
        <motion.div variants={fadeUp} className="glass-timeline__load-more">
          <Button
            variant="unstyled"
            type="button"
            className="glass-timeline__load-more-btn"
            onClick={tl.toggleShowAll}
          >
            <ChevronDown size={14} />
            Ver {tl.filtered.length - 10} más
          </Button>
        </motion.div>
      )}

      {/* ── Collapse ── */}
      {tl.showAll && tl.filtered.length > 10 && (
        <motion.div variants={fadeUp} className="glass-timeline__load-more">
          <Button
            variant="unstyled"
            type="button"
            className="glass-timeline__load-more-btn"
            onClick={tl.toggleShowAll}
          >
            <ChevronUp size={14} />
            Ver menos
          </Button>
        </motion.div>
      )}

      {/* ── Empty filtered state ── */}
      {tl.filtered.length === 0 && (
        <motion.div variants={fadeUp} className="glass-timeline__empty">
          <EmptyState
            icon={<Clock size={32} strokeWidth={1} />}
            title="Sin resultados"
            description="No hay decisiones que coincidan con los filtros seleccionados."
          />
        </motion.div>
      )}
    </motion.div>
  );
}