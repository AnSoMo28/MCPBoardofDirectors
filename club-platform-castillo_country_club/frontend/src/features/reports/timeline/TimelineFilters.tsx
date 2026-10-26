/**
 * @component TimelineFilters (Fase 25)
 * @namespace .glass-timeline__filter*
 * @depends DecisionTimeline.css
 * @note Filter bar with outcome buttons, domain dropdown, time range dropdown.
 * @import import '../DecisionTimeline.css';
 */

import { Filter } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { OutcomeFilter, TimeRange } from "../hooks/useDecisionTimeline";

/* ═══════════════════════════════════════
   Constants
   ═══════════════════════════════════════ */

const OUTCOME_OPTIONS: { value: OutcomeFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "success", label: "Exitosas" },
  { value: "partial", label: "Parciales" },
  { value: "failed", label: "Fallidas" },
];

const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "all", label: "Todo" },
  { value: "7d", label: "Última semana" },
  { value: "30d", label: "Último mes" },
  { value: "90d", label: "Últimos 3 meses" },
];

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface TimelineFiltersProps {
  outcomeFilter: OutcomeFilter;
  setOutcomeFilter: (f: OutcomeFilter) => void;
  domainFilter: string;
  setDomainFilter: (d: string) => void;
  availableDomains: string[];
  timeRange: TimeRange;
  setTimeRange: (t: TimeRange) => void;
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function TimelineFilters({
  outcomeFilter,
  setOutcomeFilter,
  domainFilter,
  setDomainFilter,
  availableDomains,
  timeRange,
  setTimeRange,
}: TimelineFiltersProps) {
  return (
    <div className="glass-timeline__filters">
      {/* Outcome filter buttons */}
      <div className="glass-timeline__filter-group">
        <Filter className="glass-timeline__filter-icon" />
        {OUTCOME_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={cn(
              "glass-timeline__filter-btn",
              outcomeFilter === opt.value &&
                "glass-timeline__filter-btn--active",
            )}
            onClick={() => setOutcomeFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Domain dropdown */}
      {availableDomains.length > 1 && (
        <select
          className="glass-timeline__filter-select"
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          aria-label="Filtrar por dominio"
        >
          <option value="all">Todos los dominios</option>
          {availableDomains.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      )}

      {/* Time range dropdown */}
      <select
        className="glass-timeline__filter-select"
        value={timeRange}
        onChange={(e) => setTimeRange(e.target.value as TimeRange)}
        aria-label="Filtrar por período"
      >
        {TIME_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}