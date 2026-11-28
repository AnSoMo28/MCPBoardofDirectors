// ═══════════════════════════════════════════════════════════
// src/features/families/FamilyList.tsx
// Phase 34+ Migration — Family List Page
// Level 6+ Agency · Production Grade
//
// Intelligence-driven family list with search, cohorts, filters,
// sort, pagination, batch operations, AI glance, and progressive
// expansion. Single responsive layout — CSS adapts, not JS.
//
// PRE-WRITE VERIFICATION:
//   Family, SortField, SortDir         → ./types.ts ✅
//   TIER_CONFIG, STATUS_CONFIG, COHORTS → ./config.ts ✅
//   useFamilyList                      → ./hooks/useFamilyList.ts ✅
//   IntelligenceGlance                 → ./components/IntelligenceGlance.tsx (Batch 5)
//   FamilyQuickPreview                 → ./components/FamilyQuickPreview.tsx (Batch 3)
//   PageContainer                      → @/shared/components/layout ✅
//   Button, Badge, Skeleton, FilterDropdown, EmptyState
//     → @/shared/components/ui ✅
//   PermissionGate                     → @/shared/components/auth ✅
//   formatCurrency                     → @/shared/lib/utils ✅
//
// ANTI-PATTERNS REMOVED:
//   - cn() import + 8 usages → data-* attributes
//   - ~60 Tailwind utilities → co-located CSS BEM
//   - 6 inline color styles → CSS custom property bridges
//   - TIER_CONFIG/STATUS_CONFIG from "./types" → "./config"
//   - COHORTS import at bottom → top
//   - BEM prefix glass-families-list__* → fm-familyList__*
//   - isDesktop JS conditional → CSS responsive
//   - reducedMotion JS check → CSS handles
//   - IIFE for days calculation → formatDaysSince helper
//   - data-testid missing → root element
//   - role="region" missing → root element
//   - No § markers → co-located CSS has 18 sections
// ═══════════════════════════════════════════════════════════

import { useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Search, Users, Plus, ChevronLeft, ChevronRight,
  AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown,
  TrendingUp, TrendingDown, Minus, X,
  CheckSquare, Square, Sparkles, Eye, MousePointerClick,
} from "lucide-react";

import { formatCurrency } from "@/shared/lib/utils";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { FilterDropdown } from "@/shared/components/ui/FilterDropdown";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { PermissionGate } from "@/shared/components/auth/PermissionGate";

import type { Family, SortField, SortDir } from "./types";
import { TIER_CONFIG, STATUS_CONFIG, COHORTS } from "./config";
import { useFamilyList } from "./hooks/useFamilyList";
import { IntelligenceGlance } from "./components/IntelligenceGlance";
import { FamilyQuickPreview } from "./components/FamilyQuickPreview";
import "./FamilyList.css";

// ═══════════════════════════════════════════════════════════
// §1  Helpers
// ═══════════════════════════════════════════════════════════

const SORT_LABELS: Record<SortField, string> = {
  name: "Familia",
  engagement: "Engagement",
  tier: "Nivel",
  lastActivity: "Actividad",
  churnRisk: "Riesgo",
  balance: "Saldo",
  memberCount: "Miembros",
};

/** Format a date string as "hace X días" */
function formatDaysSince(dateStr: string): string {
  const days = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 86_400_000,
  );
  if (isNaN(days) || days > 999) return "Sin registro";
  return `hace ${days} día${days !== 1 ? "s" : ""}`;
}

// ═══════════════════════════════════════════════════════════
// §2  Sub-components
// ═══════════════════════════════════════════════════════════

function SortHeader({
  label,
  field,
  active,
  dir,
  onSort,
}: {
  readonly label: string;
  readonly field: SortField;
  readonly active: boolean;
  readonly dir: SortDir;
  readonly onSort: (f: SortField) => void;
}) {
  return (
    <div
      className="fm-familyList__headerCell"
      role="columnheader"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <Button
        variant="unstyled"
        type="button"
        className="fm-familyList__sortBtn"
        data-active={active || undefined}
        onClick={() => onSort(field)}
      >
        {label}
        {active ? (
          dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
        ) : (
          <ArrowUpDown size={11} />
        )}
      </Button>
    </div>
  );
}

function TrendArrow({ trend }: { readonly trend: "up" | "down" | "stable" }) {
  return (
    <span className="fm-familyList__trend" data-trend={trend}>
      {trend === "up" && <TrendingUp size={12} />}
      {trend === "down" && <TrendingDown size={12} />}
      {trend === "stable" && <Minus size={12} />}
    </span>
  );
}

function Sparkline({
  points,
  color,
}: {
  readonly points: readonly number[];
  readonly color: string;
}) {
  return (
    <div className="fm-familyList__sparkline">
      {points.map((h, i) => (
        <div
          key={i}
          className="fm-familyList__sparklineBar"
          style={{
            "--bar-height": `${Math.max(2, h * 16)}px`,
            "--bar-color": color,
            "--bar-opacity": String(0.3 + (i / 6) * 0.7),
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §3  Main Component
// ═══════════════════════════════════════════════════════════

/**
 * Family list page — intelligence-driven with search, cohorts,
 * filters, sort, pagination, batch operations, and AI glance.
 *
 * Single responsive layout. CSS adapts at 1024/768/480px.
 * All animations are CSS-only (fm-familyList-* keyframes).
 *
 * @example
 * // Route: /admin/families
 * <Route path="families" element={<FamilyList />} />
 */
export default function FamilyList() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const glancePosRef = useRef<{ top: number; left: number } | null>(null);

  const {
    enrichedRows, total, totalPages,
    isLoading, isFetching, isError, error, refetch,
    search, setSearch, parsed,
    statusFilter, setStatusFilter, tierFilter, setTierFilter,
    churnFilter, setChurnFilter, activeCohort, setActiveCohort,
    hasActiveFilters, handleClearFilters,
    sortField, sortDir, handleSort,
    page, setPage,
    selected, toggleSelect, toggleSelectAll, clearSelection, batchStats,
    previewFamily, setPreviewFamily,
    glanceFamily, setGlanceFamily, glanceInsight,
    expandedRowId, setExpandedRowId,
    cohortCounts,
    statusOptions, tierOptions, churnOptions,
  } = useFamilyList();

  /* ── Glance hover positioning ── */
  const handleRowMouseEnter = useCallback(
    (family: Family, e: React.MouseEvent) => {
      hoverTimerRef.current = setTimeout(() => {
        const rowEl = e.currentTarget as HTMLElement;
        const containerEl = containerRef.current;
        if (!containerEl) return;
        const rowRect = rowEl.getBoundingClientRect();
        const contRect = containerEl.getBoundingClientRect();
        const left = rowRect.right - contRect.left + 8;
        glancePosRef.current = {
          top: rowRect.top - contRect.top,
          left:
            left + 320 > contRect.width
              ? rowRect.left - contRect.left - 328
              : left,
        };
        setGlanceFamily(family);
      }, 300);
    },
    [setGlanceFamily],
  );

  const handleRowMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setGlanceFamily(null);
    glancePosRef.current = null;
  }, [setGlanceFamily]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  /* ── Render ── */
  return (
    <PageContainer
      title="Familias"
      subtitle={`${total} familias registradas`}
      actions={
        <PermissionGate roles={["ADMIN", "STAFF"]}>
          <Button
            variant="primary"
            icon={<Plus />}
            onClick={() => navigate("/admin/families/new")}
          >
            Nueva familia
          </Button>
        </PermissionGate>
      }
    >
      <div
        ref={containerRef}
        className="fm-familyList"
        role="region"
        aria-label="Lista de familias"
        data-testid="family-list"
      >
        {/* ══════ SEARCH ══════ */}
        <div className="fm-familyList__search" role="search" aria-label="Búsqueda de familias">
          <div className="fm-familyList__searchWrap">
            <Search className="fm-familyList__searchIcon" size={16} />
            <input
              type="text"
              placeholder="Buscar familias — prueba &quot;premium riesgo alto&quot; o &quot;dormantes&quot;"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="fm-familyList__searchInput"
              aria-label="Buscar familias"
            />
            {isFetching && (
              <div className="fm-familyList__searchSpinner" aria-hidden="true" />
            )}
          </div>

          {parsed.pills.length > 0 && (
            <div className="fm-familyList__pills">
              {parsed.pills.map((pill) => (
                <span
                  key={pill.key}
                  className="fm-familyList__pill"
                  style={{ "--pill-color": pill.color } as React.CSSProperties}
                >
                  <Sparkles size={10} />
                  {pill.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ══════ COHORTS + FILTERS ══════ */}
        <div className="fm-familyList__controls">
          <div className="fm-familyList__cohorts" role="tablist" aria-label="Cohortes">
            {COHORTS.map((cohort) => {
              const isActive = activeCohort === cohort.id;
              const count = cohortCounts[cohort.id] ?? 0;
              return (
                <Button
                  variant="unstyled"
                  key={cohort.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveCohort(cohort.id)}
                  className="fm-familyList__cohortChip"
                  data-active={isActive || undefined}
                  style={
                    isActive
                      ? ({ "--chip-color": cohort.color } as React.CSSProperties)
                      : undefined
                  }
                >
                  {cohort.label}
                  {count > 0 && (
                    <span className="fm-familyList__cohortCount">{count}</span>
                  )}
                </Button>
              );
            })}
          </div>

          <div className="fm-familyList__filters">
            <FilterDropdown
              label="Estado"
              value={statusFilter}
              options={[...statusOptions]}
              onChange={(v) => {
                setStatusFilter(v as typeof statusFilter);
                setPage(1);
              }}
            />
            <FilterDropdown
              label="Nivel"
              value={tierFilter}
              options={[...tierOptions]}
              onChange={(v) => {
                setTierFilter(v as typeof tierFilter);
                setPage(1);
              }}
            />
            <FilterDropdown
              label="Riesgo"
              value={churnFilter}
              options={[...churnOptions]}
              onChange={(v) => {
                setChurnFilter(v as typeof churnFilter);
                setPage(1);
              }}
            />
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="fm-familyList__clearFilters"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>

        {/* ══════ CONTENT ══════ */}
        {isLoading ? (
          <div className="fm-familyList__skeleton" role="status" aria-label="Cargando familias">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="fm-familyList__skeletonRow" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={<AlertTriangle />}
            title="Error al cargar familias"
            description={
              error instanceof Error
                ? error.message
                : "No se pudo cargar la lista."
            }
            action={<Button onClick={() => refetch()}>Reintentar</Button>}
          />
        ) : enrichedRows.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="Sin resultados"
            description={
              hasActiveFilters || search
                ? "No se encontraron familias con estos criterios."
                : "Aún no hay familias registradas."
            }
            action={
              hasActiveFilters || search ? (
                <Button onClick={handleClearFilters}>Limpiar filtros</Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Info bar */}
            <div className="fm-familyList__info">
              <span>
                {enrichedRows.length} de {total} familias
                {activeCohort !== "all" && " (cohort filtrado)"}
              </span>
              <span className="fm-familyList__infoSort">
                · Por {SORT_LABELS[sortField]}{" "}
                {sortDir === "asc" ? "↑" : "↓"}
              </span>
            </div>

            {/* ══════ TABLE ══════ */}
            <div
              className="fm-familyList__table"
              role="grid"
              aria-label="Lista de familias"
            >
              {/* Header */}
              <div className="fm-familyList__header" role="row">
                <div className="fm-familyList__headerCell" role="columnheader">
                  <Button
                    variant="unstyled"
                    type="button"
                    className="fm-familyList__selectAll"
                    onClick={toggleSelectAll}
                    aria-label={
                      selected.size === enrichedRows.length
                        ? "Deseleccionar todas"
                        : "Seleccionar todas"
                    }
                  >
                    {selected.size === enrichedRows.length ? (
                      <CheckSquare size={16} />
                    ) : (
                      <Square size={16} />
                    )}
                  </Button>
                </div>
                <SortHeader
                  label="Familia"
                  field="name"
                  active={sortField === "name"}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <div className="fm-familyList__headerCell" role="columnheader">
                  Nivel
                </div>
                <div className="fm-familyList__headerCell" role="columnheader">
                  Estado
                </div>
                <SortHeader
                  label="Miembros"
                  field="memberCount"
                  active={sortField === "memberCount"}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Engagement"
                  field="engagement"
                  active={sortField === "engagement"}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Saldo"
                  field="balance"
                  active={sortField === "balance"}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <div className="fm-familyList__headerCell" role="columnheader">
                  Señal
                </div>
                <div
                  className="fm-familyList__headerCell"
                  role="columnheader"
                >
                  <span className="sr-only">Acciones</span>
                </div>
              </div>

              {/* Data rows */}
              {enrichedRows.map((row, index) => {
                const {
                  family, signalConfig, trend, sparklinePoints, engagementColor,
                } = row;

                const tier = TIER_CONFIG[family.tier];
                const status = STATUS_CONFIG[family.status];
                const isSelected = selected.has(family.id);
                const isExpanded = expandedRowId === family.id;
                const isGlance = glanceFamily?.id === family.id;
                return (
                  <div key={family.id} className="fm-familyList__rowGroup">
                    {/* Row */}
                    <div
                      className="fm-familyList__row"
                      role="row"
                      data-signal={signalConfig.signal}
                      data-selected={isSelected || undefined}
                      data-glance={isGlance || undefined}
                      style={{ "--row-index": index } as React.CSSProperties}
                      onMouseEnter={(e) => handleRowMouseEnter(family, e)}
                      onMouseLeave={handleRowMouseLeave}
                    >
                      {/* Checkbox */}
                      <div className="fm-familyList__cell" role="gridcell">
                        <Button
                          variant="unstyled"
                          type="button"
                          className="fm-familyList__checkbox"
                          data-selected={isSelected || undefined}
                          onClick={() => toggleSelect(family.id)}
                          aria-label={`${isSelected ? "Deseleccionar" : "Seleccionar"} ${family.familyName}`}
                        >
                          {isSelected ? (
                            <CheckSquare size={16} />
                          ) : (
                            <Square size={16} />
                          )}
                        </Button>
                      </div>

                      {/* Family name */}
                      <div className="fm-familyList__cell" role="gridcell">
                        <Button
                          variant="unstyled"
                          type="button"
                          className="fm-familyList__familyBtn"
                          onClick={() =>
                            setExpandedRowId(
                              isExpanded ? null : family.id,
                            )
                          }
                        >
                          <p className="fm-familyList__familyName">
                            {family.familyName}
                          </p>
                          <p className="fm-familyList__familyContact">
                            {family.primaryContact.firstName}{" "}
                            {family.primaryContact.lastName}
                          </p>
                        </Button>
                      </div>

                      {/* Tier */}
                      <div className="fm-familyList__cell" role="gridcell">
                        <Badge
                          variant={
                            family.tier === "platino"
                              ? "neutral"
                              : family.tier === "oro"
                                ? "gold"
                                : family.tier === "plata"
                                  ? "info"
                                  : "warning"
                          }
                          size="sm"
                        >
                          {tier?.label}
                        </Badge>
                      </div>

                      {/* Status */}
                      <div className="fm-familyList__cell" role="gridcell">
                        <span
                          className="fm-familyList__status"
                          style={
                            {
                              "--status-color": status?.color,
                            } as React.CSSProperties
                          }
                        >
                          <span className="fm-familyList__statusDot" />
                          {status?.label}
                        </span>
                      </div>

                      {/* Members */}
                      <div className="fm-familyList__cell" role="gridcell">
                        <span className="fm-familyList__members">
                          {family.memberCount}
                        </span>
                      </div>

                      {/* Engagement */}
                      <div className="fm-familyList__cell" role="gridcell">
                        <div
                          className="fm-familyList__engagement"
                          style={
                            {
                              "--eng-color": engagementColor,
                            } as React.CSSProperties
                          }
                        >
                          <Sparkline
                            points={sparklinePoints}
                            color={engagementColor}
                          />
                          <span className="fm-familyList__engagementScore">
                            {family.engagementScore}
                          </span>
                          <TrendArrow trend={trend} />
                        </div>
                      </div>

                      {/* Balance */}
                      <div className="fm-familyList__cell" role="gridcell">
                        <span
                          className="fm-familyList__balance"
                          data-negative={
                            family.totalBalance < 0 || undefined
                          }
                        >
                          {formatCurrency(family.totalBalance)}
                        </span>
                      </div>

                      {/* Signal */}
                      <div className="fm-familyList__cell" role="gridcell">
                        {signalConfig.signal !== "none" && (
                          <span
                            className="fm-familyList__signalBadge"
                            style={
                              {
                                "--signal-color": signalConfig.color,
                                "--signal-bg": signalConfig.bgColor,
                              } as React.CSSProperties
                            }
                          >
                            {signalConfig.label}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="fm-familyList__cell" role="gridcell">
                        <div className="fm-familyList__actions">
                          <div className="fm-familyList__quickActions">
                            <Button
                              variant="unstyled"
                              type="button"
                              className="fm-familyList__quickAction"
                              onClick={(e) => {
                                e.stopPropagation();
                                setGlanceFamily(family);
                              }}
                              aria-label="Vistazo AI"
                              title="Vistazo AI"
                            >
                              <Eye size={14} />
                            </Button>
                            <Button
                              variant="unstyled"
                              type="button"
                              className="fm-familyList__quickAction"
                              onClick={() => toggleSelect(family.id)}
                              aria-label={
                                isSelected
                                  ? "Deseleccionar"
                                  : "Seleccionar"
                              }
                              title="Seleccionar"
                            >
                              <MousePointerClick size={14} />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/admin/families/${family.id}`)
                            }
                            className="fm-familyList__viewBtn"
                          >
                            Ver
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded row */}
                    {isExpanded && (
                      <div className="fm-familyList__expanded">
                        <div className="fm-familyList__expandedInner">
                          <div>
                            <span className="fm-familyList__expandedLabel">
                              Miembros
                            </span>
                            <div className="fm-familyList__avatars">
                              {family.members.slice(0, 6).map((m) => (
                                <span
                                  key={m.id}
                                  className="fm-familyList__avatar"
                                  title={`${m.firstName} ${m.lastName}`}
                                >
                                  {m.firstName.charAt(0)}
                                  {m.lastName.charAt(0)}
                                </span>
                              ))}
                              {family.members.length > 6 && (
                                <span className="fm-familyList__avatar fm-familyList__avatar--overflow">
                                  +{family.members.length - 6}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="fm-familyList__expandedMeta">
                            <span className="fm-familyList__expandedLabel">
                              Última actividad
                            </span>
                            <span className="fm-familyList__expandedValue">
                              {formatDaysSince(family.lastActivity)}
                            </span>
                          </div>

                          <div className="fm-familyList__expandedMeta">
                            <span className="fm-familyList__expandedLabel">
                              Tier
                            </span>
                            <span className="fm-familyList__expandedValue">
                              {tier?.label}
                            </span>
                          </div>

                          <div className="fm-familyList__expandedMeta">
                            <span className="fm-familyList__expandedLabel">
                              Saldo
                            </span>
                            <span className="fm-familyList__expandedValue">
                              {formatCurrency(family.totalBalance)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ══════ PAGINATION ══════ */}
            {totalPages > 1 && (
              <nav
                aria-label="Paginación"
                className="fm-familyList__pagination"
              >
                <p className="fm-familyList__paginationInfo">
                  Página {page} de {totalPages}
                </p>
                <div className="fm-familyList__paginationControls">
                  <Button
                    variant="ghost"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    aria-label="Página anterior"
                    icon={<ChevronLeft />}
                  />
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={page === totalPages}
                    aria-label="Página siguiente"
                    icon={<ChevronRight />}
                  />
                </div>
              </nav>
            )}
          </>
        )}

        {/* ══════ INTELLIGENCE GLANCE ══════ */}
        {glanceFamily && glanceInsight && (
          <div
            style={
              glancePosRef.current
                ? {
                    position: "absolute",
                    top: glancePosRef.current.top,
                    left: glancePosRef.current.left,
                  }
                : undefined
            }
          >
            <IntelligenceGlance
              family={glanceFamily}
              insight={glanceInsight}
              onClose={() => setGlanceFamily(null)}
              onViewProfile={() => {
                setGlanceFamily(null);
                navigate(`/admin/families/${glanceFamily.id}`);
              }}
            />
          </div>
        )}

        {/* ══════ QUICK PREVIEW ══════ */}
        <FamilyQuickPreview
          family={previewFamily}
          onClose={() => setPreviewFamily(null)}
        />

        {/* ══════ BATCH BAR ══════ */}
        {batchStats && (
          <div className="fm-familyList__batchBar" role="toolbar" aria-label="Acciones en lote">
            <div className="fm-familyList__batchBarInner">
              <div className="fm-familyList__batchStats">
                <div className="fm-familyList__batchStat">
                  <span className="fm-familyList__batchLabel">
                    Seleccionadas
                  </span>
                  <span className="fm-familyList__batchValue">
                    {batchStats.count}
                  </span>
                </div>

                <div className="fm-familyList__batchStat">
                  <span className="fm-familyList__batchLabel">
                    Eng. promedio
                  </span>
                  <span className="fm-familyList__batchValue">
                    {batchStats.avgEngagement}
                  </span>
                </div>

                <div className="fm-familyList__batchStat">
                  <span className="fm-familyList__batchLabel">
                    Saldo total
                  </span>
                  <span className="fm-familyList__batchValue">
                    {formatCurrency(batchStats.totalBalance)}
                  </span>
                </div>

                <div className="fm-familyList__batchTiers">
                  {batchStats.tiers.map(({ tier, count }) => (
                    <span key={tier} className="fm-familyList__batchTier">
                      {TIER_CONFIG[tier]?.label} {count}
                    </span>
                  ))}
                </div>

                {batchStats.risks.critical > 0 && (
                  <span
                    className="fm-familyList__batchRisk"
                    data-risk-level="critical"
                  >
                    {batchStats.risks.critical} crítica
                    {batchStats.risks.critical > 1 ? "s" : ""}
                  </span>
                )}
                {batchStats.risks.high > 0 && (
                  <span
                    className="fm-familyList__batchRisk"
                    data-risk-level="high"
                  >
                    {batchStats.risks.high} alto riesgo
                  </span>
                )}
              </div>

              <div className="fm-familyList__batchActions">
                {batchStats.suggestion && (
                  <span className="fm-familyList__batchSuggestion">
                    {batchStats.suggestion}
                  </span>
                )}
                <Button variant="ghost" size="sm">
                  Enviar comunicación
                </Button>
                <Button variant="ghost" size="sm">
                  Exportar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  icon={<X size={14} />}
                  className="fm-familyList__batchClear"
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}