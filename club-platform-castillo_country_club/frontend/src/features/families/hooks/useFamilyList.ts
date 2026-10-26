// ═══════════════════════════════════════════════════════════
// src/features/families/hooks/useFamilyList.ts
// Phase 34+ Migration — Family List Orchestration Hook
// Level 6+ Agency · Production Grade
//
// Owns all state, queries, processing, handlers, and derived
// intelligence for the family list view. Components consuming
// this hook become pure rendering — zero logic.
//
// Architecture:
//   useMCPQuery          → filtered/paginated data from MCP backend
//   familySignals        → row enrichment (signals, sparklines, trends)
//   config               → cohort definitions, visual identity, pagination
//   types                → canonical type definitions
//
// PRE-WRITE VERIFICATION:
//   Family, FamilyListResponse, FamilyStatus, MemberTier, ChurnRisk
//     → ../types.ts §1-3 ✅
//   BatchStats, CohortId, SortField, SortDir, RowSignal, RowSignalConfig
//     → ../types.ts §1,5,7 ✅
//   COHORTS, DEFAULT_PAGE_SIZE, DEFAULT_SORT, ROW_SIGNALS
//     → ../config.ts §6,15,11 ✅
//   TIER_CONFIG, STATUS_CONFIG, CHURN_CONFIG
//     → ../config.ts §2,3,4 ✅
//   daysSince, deriveTrend, getRowSignal, getSparklinePoints
//     → ../lib/familySignals.ts §2-5 ✅
//   parseSmartSearch, generateGlanceInsight
//     → ../lib/familySignals.ts §10,11 ✅
//   GlanceInsight, ParsedSearch, Trend (from familySignals — richer than types.ts)
//     → ../lib/familySignals.ts §1 ✅
//   useMCPQuery → @/shared/hooks/useMCPQuery.ts ✅
//   useBreakpoint → @/shared/hooks/useBreakpoint.ts ✅ (return: { isDesktop: boolean })
//   keepPreviousData → @tanstack/react-query v5 ✅
//
// ANTI-PATTERNS REMOVED:
//   - TIER_CONFIG/STATUS_CONFIG/CHURN_CONFIG from "../types" → "../config"
//   - useReducedMotion hook (E-07) → CSS [data-prefers-reduced] handles motion
//   - Local EnrichedRow (conflicts types.ts Trend shape) → ListRow
//   - Local BatchStats (mutable duplicate) → import from types.ts
//   - CohortId/SortField/SortDir/RowSignal from config → from types
//   - error as Error | null → error: unknown
//   - No readonly → all interfaces readonly
//   - Alphabetical tier/churn sort → ordinal sort maps
//   - No § markers → 5 sections
//   - No PRE-WRITE VERIFICATION → header block
//
// CHECKLIST: TSX-1-39 (hook-level: A-05, B-07, B-08)
// ═══════════════════════════════════════════════════════════

import { useState, useDeferredValue, useCallback, useMemo, useEffect } from "react";
import { keepPreviousData } from "@tanstack/react-query";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";

import type {
  Family,
  FamilyListResponse,
  FamilyStatus,
  MemberTier,
  ChurnRisk,
  BatchStats,
  CohortId,
  SortField,
  SortDir,
  RowSignalConfig,
} from "../types";

import {
  COHORTS,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  TIER_CONFIG,
  STATUS_CONFIG,
  CHURN_CONFIG,
} from "../config";

import {
  deriveTrend,
  getRowSignal,
  getSparklinePoints,
  parseSmartSearch,
  generateGlanceInsight,
  type GlanceInsight,
  type ParsedSearch,
  type Trend,
} from "../lib/familySignals";

// ═══════════════════════════════════════════════════════════
// §1  Local Types
// ═══════════════════════════════════════════════════════════

/**
 * Enriched row data for the family list table.
 * Precomputed per-family for zero-cost rendering.
 *
 * Note: Uses familySignals Trend (flat "up"|"down"|"stable")
 * NOT types.ts Trend (structured {direction, delta, period}).
 * The flat version is consumed directly by sparkline and row UI.
 *
 * signalConfig gives access to all RowSignalConfig properties:
 *   signal, label, color, bgColor, borderColor, cssClass, weight
 */
interface ListRow {
  readonly family: Family;
  readonly signalConfig: RowSignalConfig;
  readonly trend: Trend;
  readonly sparklinePoints: readonly number[];
  readonly engagementColor: string;
}

/** Sort ordinal maps for non-alphabetical fields */
const TIER_ORDINAL: Record<MemberTier, number> = {
  basic: 0,
  bronce: 1,
  plata: 2,
  premium: 3,
  oro: 4,
  vip: 5,
  platino: 6,
};

const CHURN_ORDINAL: Record<ChurnRisk, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

// ═══════════════════════════════════════════════════════════
// §2  Helpers
// ═══════════════════════════════════════════════════════════

/**
 * Extract sortable value from a Family object.
 * Returns ordinal numbers for tier/churnRisk (not alphabetical).
 */
function getSortValue(family: Family, field: SortField): number | string {
  switch (field) {
    case "name":
      return family.familyName;
    case "engagement":
      return family.engagementScore;
    case "tier":
      return TIER_ORDINAL[family.tier] ?? 0;
    case "lastActivity":
      return family.lastActivity;
    case "churnRisk":
      return CHURN_ORDINAL[family.churnRisk] ?? 0;
    case "balance":
      return family.totalBalance;
    case "memberCount":
      return family.memberCount;
    default:
      return "";
  }
}

// ═══════════════════════════════════════════════════════════
// §3  Return Type
// ═══════════════════════════════════════════════════════════

export interface UseFamilyListReturn {
  // ── Data ──
  readonly families: readonly Family[];
  readonly enrichedRows: readonly ListRow[];
  readonly total: number;
  readonly totalPages: number;

  // ── Loading ──
  readonly isLoading: boolean;
  readonly isFetching: boolean;
  readonly isError: boolean;
  readonly error: unknown;
  readonly refetch: () => void;

  // ── Search & filters ──
  readonly search: string;
  readonly setSearch: (v: string) => void;
  readonly parsed: ParsedSearch;
  readonly statusFilter: FamilyStatus | "";
  readonly setStatusFilter: (v: FamilyStatus | "") => void;
  readonly tierFilter: MemberTier | "";
  readonly setTierFilter: (v: MemberTier | "") => void;
  readonly churnFilter: ChurnRisk | "";
  readonly setChurnFilter: (v: ChurnRisk | "") => void;
  readonly activeCohort: CohortId;
  readonly setActiveCohort: (v: CohortId) => void;
  readonly hasActiveFilters: boolean;
  readonly handleClearFilters: () => void;

  // ── Sort ──
  readonly sortField: SortField;
  readonly sortDir: SortDir;
  readonly handleSort: (field: SortField) => void;

  // ── Pagination ──
  readonly page: number;
  readonly setPage: (p: number | ((prev: number) => number)) => void;

  // ── Selection ──
  readonly selected: ReadonlySet<string>;
  readonly toggleSelect: (id: string) => void;
  readonly toggleSelectAll: () => void;
  readonly clearSelection: () => void;
  readonly batchStats: BatchStats | null;

  // ── Preview & Glance ──
  readonly previewFamily: Family | null;
  readonly setPreviewFamily: (f: Family | null) => void;
  readonly glanceFamily: Family | null;
  readonly setGlanceFamily: (f: Family | null) => void;
  readonly glanceInsight: GlanceInsight | null;

  // ── Expanded row ──
  readonly expandedRowId: string | null;
  readonly setExpandedRowId: (id: string | null) => void;

  // ── Cohort counts ──
  readonly cohortCounts: Partial<Record<CohortId, number>>;

  // ── Filter options ──
  readonly statusOptions: ReadonlyArray<{ readonly value: string; readonly label: string; readonly color: string }>;
  readonly tierOptions: ReadonlyArray<{ readonly value: string; readonly label: string; readonly color: string }>;
  readonly churnOptions: ReadonlyArray<{ readonly value: string; readonly label: string; readonly color: string }>;

  // ── UI ──
  readonly isDesktop: boolean;
}

// ═══════════════════════════════════════════════════════════
// §4  Hook
// ═══════════════════════════════════════════════════════════

/**
 * Family List orchestration hook.
 *
 * Owns the complete data-to-render pipeline for the family list view:
 *   1. MCP query → filtered, paginated raw data
 *   2. Smart search → NL parsing with auto-filter application
 *   3. Cohort filtering → client-side smart segmentation
 *   4. Row enrichment → signals, sparklines, trends per family
 *   5. Batch selection → multi-select with aggregated stats
 *   6. Glance insight → quick intelligence for preview cards
 *
 * Components consuming this hook become pure rendering — zero logic.
 *
 * @example
 * const list = useFamilyList();
 * <FamilyTable rows={list.enrichedRows} onSort={list.handleSort} />
 * <Pagination page={list.page} totalPages={list.totalPages} onChange={list.setPage} />
 */
export function useFamilyList(): UseFamilyListReturn {
  const { isDesktop } = useBreakpoint();

  // ── State ──
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FamilyStatus | "">("");
  const [tierFilter, setTierFilter] = useState<MemberTier | "">("");
  const [churnFilter, setChurnFilter] = useState<ChurnRisk | "">("");
  const [page, setPage] = useState(1);
  const [activeCohort, setActiveCohort] = useState<CohortId>("all");
  const [sortField, setSortField] = useState<SortField>(DEFAULT_SORT.field);
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_SORT.dir);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewFamily, setPreviewFamily] = useState<Family | null>(null);
  const [glanceFamily, setGlanceFamily] = useState<Family | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // ── Smart Search (NL parsing → text + auto-filters + pills) ──
  const parsed = useMemo(() => parseSmartSearch(search), [search]);
  const deferredText = useDeferredValue(parsed.text);

  // ── Auto-apply NL-detected filters ──
  useEffect(() => {
    if (parsed.autoFilters.tier && parsed.autoFilters.tier !== tierFilter) {
      setTierFilter(parsed.autoFilters.tier);
    }
    if (parsed.autoFilters.churn && parsed.autoFilters.churn !== churnFilter) {
      setChurnFilter(parsed.autoFilters.churn);
    }
    if (parsed.autoFilters.status && parsed.autoFilters.status !== statusFilter) {
      setStatusFilter(parsed.autoFilters.status);
    }
  }, [parsed.autoFilters, tierFilter, churnFilter, statusFilter]);

  // ── MCP Query — server-side filtered + paginated ──
  const { data, isLoading, isError, error, isFetching, refetch } =
    useMCPQuery<FamilyListResponse>(
      "family_profile",
      "family_search",
      {
        query: deferredText || undefined,
        tier: tierFilter || undefined,
        status: statusFilter || undefined,
        churnRisk: churnFilter || undefined,
        page,
        limit: DEFAULT_PAGE_SIZE,
      },
      { placeholderData: keepPreviousData },
    );

  const families = data?.families ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // ── Enriched rows (cohort filter → sort → signal enrichment) ──
  const enrichedRows = useMemo((): readonly ListRow[] => {
    let result = [...families];

    // Cohort filter (client-side on top of server-side filters)
    if (activeCohort !== "all") {
      const cohort = COHORTS.find((c) => c.id === activeCohort);
      if (cohort) result = result.filter(cohort.match);
    }

    // Sort (ordinal-aware for tier/churn)
    result.sort((a, b) => {
      const aVal = getSortValue(a, sortField);
      const bVal = getSortValue(b, sortField);
      const mod = sortDir === "asc" ? 1 : -1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal, "es") * mod;
      }
      return ((aVal as number) - (bVal as number)) * mod;
    });

    // Enrich each row with signals, sparklines, trend
    return result.map((family): ListRow => {
      const signalConfig = getRowSignal(family);
      const trend = deriveTrend(family);
      const sparklinePoints = getSparklinePoints(family);

      // Engagement color driven by score thresholds
      const engagementColor =
        family.engagementScore >= 70
          ? "var(--color-emerald-400)"
          : family.engagementScore >= 40
            ? "var(--color-amber-400)"
            : "var(--color-rose-400)";

      return { family, signalConfig, trend, sparklinePoints, engagementColor };
    });
  }, [families, activeCohort, sortField, sortDir]);

  // ── Cohort counts (for tab badges) ──
  const cohortCounts = useMemo((): Partial<Record<CohortId, number>> => {
    const counts: Partial<Record<CohortId, number>> = {};
    for (const cohort of COHORTS) {
      counts[cohort.id] = families.filter(cohort.match).length;
    }
    return counts;
  }, [families]);

  // ── Batch stats (multi-select aggregation) ──
  const batchStats = useMemo((): BatchStats | null => {
    if (selected.size < 2) return null;
    const sel = families.filter((f) => selected.has(f.id));
    if (sel.length === 0) return null;

    const dist = { high: 0, medium: 0, low: 0 };
    sel.forEach((f) => {
      if (f.engagementScore >= 70) dist.high++;
      else if (f.engagementScore >= 40) dist.medium++;
      else dist.low++;
    });

    const tierMap = new Map<MemberTier, number>();
    sel.forEach((f) => tierMap.set(f.tier, (tierMap.get(f.tier) ?? 0) + 1));
    const tiers = Array.from(tierMap.entries()).map(([tier, count]) => ({
      tier,
      count,
    }));

    const risks = { critical: 0, high: 0 };
    sel.forEach((f) => {
      if (f.churnRisk === "critical") risks.critical++;
      else if (f.churnRisk === "high") risks.high++;
    });

    const avgEngagement = Math.round(
      sel.reduce((s, f) => s + f.engagementScore, 0) / sel.length,
    );
    const totalBalance = sel.reduce((s, f) => s + f.totalBalance, 0);

    let suggestion = "";
    if (risks.critical + risks.high > 0) {
      suggestion = `${risks.critical + risks.high} en riesgo → Enviar comunicación de retención`;
    } else if (dist.high === sel.length) {
      suggestion = "Todas con alto engagement → Candidatas para referidos";
    } else if (sel.some((f) => f.totalBalance < -500000)) {
      suggestion =
        "Saldo negativo significativo → Gestionar cobro prioritario";
    }

    return {
      count: sel.length,
      avgEngagement,
      totalBalance,
      dist,
      tiers,
      risks,
      suggestion,
    };
  }, [families, selected]);

  // ── Glance insight (quick intelligence for preview card) ──
  const glanceInsight = useMemo(
    () => (glanceFamily ? generateGlanceInsight(glanceFamily) : null),
    [glanceFamily],
  );

  // ── Handlers ──

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("desc");
      }
    },
    [sortField],
  );

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("");
    setTierFilter("");
    setChurnFilter("");
    setActiveCohort("all");
    setPage(1);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === enrichedRows.length) return new Set();
      return new Set(enrichedRows.map((r) => r.family.id));
    });
  }, [enrichedRows]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // ── Filter options (from config visual identity) ──
  const statusOptions = useMemo(
    () =>
      Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
        value: key,
        label: cfg.label,
        color: cfg.color,
      })),
    [],
  );

  const tierOptions = useMemo(
    () =>
      Object.entries(TIER_CONFIG).map(([key, cfg]) => ({
        value: key,
        label: cfg.label,
        color: cfg.color,
      })),
    [],
  );

  const churnOptions = useMemo(
    () =>
      Object.entries(CHURN_CONFIG).map(([key, cfg]) => ({
        value: key,
        label: cfg.label,
        color: cfg.color,
      })),
    [],
  );

  const hasActiveFilters = Boolean(
    statusFilter || tierFilter || churnFilter || activeCohort !== "all",
  );

  // ── Return ──
  return {
    // Data
    families,
    enrichedRows,
    total,
    totalPages,
    // Loading
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    // Search & filters
    search,
    setSearch,
    parsed,
    statusFilter,
    setStatusFilter,
    tierFilter,
    setTierFilter,
    churnFilter,
    setChurnFilter,
    activeCohort,
    setActiveCohort,
    hasActiveFilters,
    handleClearFilters,
    // Sort
    sortField,
    sortDir,
    handleSort,
    // Pagination
    page,
    setPage,
    // Selection
    selected,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    batchStats,
    // Preview & Glance
    previewFamily,
    setPreviewFamily,
    glanceFamily,
    setGlanceFamily,
    glanceInsight,
    // Expanded row
    expandedRowId,
    setExpandedRowId,
    // Cohort counts
    cohortCounts,
    // Filter options
    statusOptions,
    tierOptions,
    churnOptions,
    // UI
    isDesktop,
  };
}