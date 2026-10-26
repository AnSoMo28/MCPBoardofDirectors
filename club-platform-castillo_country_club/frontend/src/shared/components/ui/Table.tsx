/**
 * Table.tsx
 * src/shared/components/ui/Table.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @namespace   .ui-table
 * @keyframes   2 (ui-table-row-cascade, ui-table-bar-in) — in Table.css
 * @depends     globals.css §1 tokens, useReducedMotion, lucide-react
 *
 * PRE-WRITE VERIFICATION:
 * [x] cn utility verified in shared/lib/utils
 * [x] useReducedMotion verified in shared/hooks/useReducedMotion
 * [x] Search, ArrowUpDown, ArrowUp, ArrowDown, X verified in lucide-react
 * [x] All tokens verified against globals.css §1
 * [x] --shadow-elevated does NOT exist → using --shadow-md
 *
 * ANTI-PATTERNS REMOVED:
 * [x] framer-motion (motion.tr, AnimatePresence) → CSS lifecycle (0KB)
 * [x] ~120 Tailwind utilities → BEM CSS classes (.ui-table__*)
 * [x] Math.random() skeleton widths → deterministic --skel-width
 * [x] font-[family-name:var(--font-*)] → CSS font-family
 * [x] transition-colors → specific properties in CSS
 * [x] animate-pulse → ui-skeleton-shimmer via Skeleton.css
 * [x] accent-[var(--color-gold-400)] → CSS accent-color
 * [x] bg-[...]/[0.06] opacity hack → color-mix() in CSS
 * [x] border-white/[0.06|0.04|0.14] → tokenized CSS
 * [x] hover:bg-white/[...] → CSS :hover
 * [x] style={{ minHeight: 40 }} → CSS min-height
 * [x] motion.tr (invalid HTML) → plain <tr> + CSS animation
 * [x] Missing data-testid → added
 * [x] Missing light mode → added in CSS
 * [x] Missing reduced motion → CSS + hook
 * [x] Unused prevFilteredLen ref → removed
 * [x] Mutable props → readonly
 */

// ═══ React core ═══
import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
  type ChangeEvent,
  type CSSProperties,
} from "react";

// ═══ Third-party ═══
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";

// ═══ Shared — values ═══
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import "./Table.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   ═══════════════════════════════════════════════════════════════ */

export interface Column<T> {
  readonly key: string;
  readonly header: string;
  readonly width?: string;
  readonly align?: "left" | "center" | "right";
  readonly searchable?: boolean;
  readonly sortable?: boolean;
  readonly sortValue?: (row: T) => string | number;
  readonly render: (row: T, index: number) => ReactNode;
}

export interface TableProps<T> {
  readonly columns: ReadonlyArray<Column<T>>;
  readonly data: ReadonlyArray<T>;
  readonly rowKey?: (row: T, index: number) => string;
  readonly onRowClick?: (row: T) => void;
  readonly emptyMessage?: string;
  readonly loading?: boolean;
  readonly skeletonRows?: number;
  readonly searchable?: boolean;
  readonly searchPlaceholder?: string;
  readonly selectable?: boolean;
  readonly onSelectionChange?: (selectedKeys: string[]) => void;
  readonly bulkActions?: ReactNode;
  readonly className?: string;
}

type SortDir = "asc" | "desc" | null;

interface SortState {
  readonly col: string | null;
  readonly dir: SortDir;
}


/* ═══════════════════════════════════════════════════════════════
   §2  CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

/** Deterministic skeleton widths (no Math.random in render). */
const SKELETON_WIDTHS = ["55%", "40%", "70%", "50%", "65%", "45%", "60%", "55%"] as const;


/* ═══════════════════════════════════════════════════════════════
   §3  COMPONENT — Table
   Generic data table with sort, search, selection, bulk actions.
   CSS-only animation lifecycle (no framer-motion).
   ═══════════════════════════════════════════════════════════════ */

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyMessage = "No hay datos disponibles",
  loading = false,
  skeletonRows = 5,
  searchable = false,
  searchPlaceholder = "Buscar...",
  selectable = false,
  onSelectionChange,
  bulkActions,
  className,
}: TableProps<T>) {

  /* ─── §3.1  Refs + Hooks ─────────────────────────────────── */

  const reducedMotion = useReducedMotion();
  const checkAllRef = useRef<HTMLInputElement>(null);


  /* ─── §3.2  State ────────────────────────────────────────── */

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>({ col: null, dir: null });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cascadeKey, setCascadeKey] = useState(0);

  /* Bulk actions bar lifecycle */
  const [bulkShouldRender, setBulkShouldRender] = useState(false);
  const [bulkVisible, setBulkVisible] = useState(false);


  /* ─── §3.3  Derived ──────────────────────────────────────── */

  const getKey = useCallback(
    (row: T, i: number) => rowKey?.(row, i) ?? String(i),
    [rowKey],
  );

  const searchableKeys = useMemo(
    () => columns.filter((c) => c.searchable !== false).map((c) => c.key),
    [columns],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) =>
      searchableKeys.some((key) => {
        const val = row[key];
        return val != null && String(val).toLowerCase().includes(q);
      }),
    );
  }, [data, search, searchableKeys]);

  const sorted = useMemo(() => {
    if (!sort.col || !sort.dir) return filtered;
    const col = columns.find((c) => c.key === sort.col);
    if (!col) return filtered;

    return [...filtered].sort((a, b) => {
      const av = col.sortValue ? col.sortValue(a) : (a[sort.col as keyof T] as string | number);
      const bv = col.sortValue ? col.sortValue(b) : (b[sort.col as keyof T] as string | number);

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      const aNorm = typeof av === "string" ? av.toLowerCase() : av;
      const bNorm = typeof bv === "string" ? bv.toLowerCase() : bv;

      if (aNorm < bNorm) return sort.dir === "asc" ? -1 : 1;
      if (aNorm > bNorm) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sort, columns]);

  const filteredKeys = useMemo(
    () => new Set(sorted.map((row, i) => getKey(row, i))),
    [sorted, getKey],
  );

  const selectedInFiltered = useMemo(
    () => Array.from(selected).filter((k) => filteredKeys.has(k)).length,
    [selected, filteredKeys],
  );

  const countText = useMemo(() => {
    const total = data.length;
    const shown = sorted.length;
    if (shown === total) return `${total} resultado${total !== 1 ? "s" : ""}`;
    return `${shown} de ${total}`;
  }, [data.length, sorted.length]);


  /* ─── §3.4  Effects — Bulk actions lifecycle ─────────────── */

  useEffect(() => {
    if (selectable && selected.size > 0 && bulkActions) {
      setBulkShouldRender(true);
      if (reducedMotion) {
        setBulkVisible(true);
      } else {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setBulkVisible(true);
          });
        });
      }
    } else {
      setBulkVisible(false);
      if (reducedMotion) {
        setBulkShouldRender(false);
      } else {
        const timer = setTimeout(() => setBulkShouldRender(false), 200);
        return () => clearTimeout(timer);
      }
    }
  }, [selectable, selected.size, bulkActions, reducedMotion]);


  /* ─── §3.5  Effects — Selection sync + indeterminate ─────── */

  useEffect(() => {
    onSelectionChange?.(Array.from(selected));
  }, [selected, onSelectionChange]);

  useEffect(() => {
    if (!checkAllRef.current) return;
    const total = sorted.length;
    checkAllRef.current.indeterminate = selectedInFiltered > 0 && selectedInFiltered < total;
  }, [selectedInFiltered, sorted.length]);


  /* ─── §3.6  Handlers ─────────────────────────────────────── */

  const handleSort = useCallback((colKey: string) => {
    setSort((prev) => {
      if (prev.col === colKey) {
        if (prev.dir === "asc") return { col: colKey, dir: "desc" };
        if (prev.dir === "desc") return { col: null, dir: null };
      }
      return { col: colKey, dir: "asc" };
    });
    setCascadeKey((k) => k + 1);
  }, []);

  const handleHeaderKeyDown = useCallback(
    (e: React.KeyboardEvent, colKey: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSort(colKey);
      }
    },
    [handleSort],
  );

  const handleSelectRow = useCallback((key: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelected(new Set(sorted.map((row, i) => getKey(row, i))));
      } else {
        setSelected(new Set());
      }
    },
    [sorted, getKey],
  );

  const handleClearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearch("");
  }, []);


  /* ─── §3.7  Render ───────────────────────────────────────── */

  return (
    <div data-testid="ui-table" className={cn("ui-table", className)}>

      {/* ── Toolbar ── */}
      {(searchable || selectable) && (
        <div className="ui-table__toolbar">
          {searchable && (
            <div className="ui-table__search-wrap">
              <Search size={15} strokeWidth={1.5} className="ui-table__search-icon" aria-hidden="true" />
              <input
                type="text"
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="ui-table__search-input"
                aria-label="Buscar en tabla"
              />
              {search && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="ui-table__search-clear"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={14} strokeWidth={1.5} />
                </button>
              )}
            </div>
          )}

          <span className="ui-table__count">{countText}</span>

          {selectable && selected.size > 0 && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="ui-table__deselect"
            >
              Deseleccionar ({selected.size})
            </button>
          )}
        </div>
      )}

      {/* ── Bulk actions bar ── */}
      {bulkShouldRender && (
        <div
          data-testid="ui-table-bulk-bar"
          className={cn(
            "ui-table__bulk-bar",
            bulkVisible && "ui-table__bulk-bar--visible",
          )}
        >
          <span className="ui-table__bulk-count">
            {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
          </span>
          <span className="ui-table__bulk-spacer" />
          {bulkActions}
        </div>
      )}

      {/* ── Table wrapper (horizontal scroll) ── */}
      <div className="ui-table__scroll">
        <table className="ui-table__el" role="table">

          {/* ── Thead ── */}
          <thead className="ui-table__thead">
            <tr className="ui-table__head-row">
              {selectable && (
                <th className="ui-table__th ui-table__th--checkbox">
                  <input
                    ref={checkAllRef}
                    type="checkbox"
                    checked={sorted.length > 0 && selectedInFiltered === sorted.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="ui-table__checkbox"
                    aria-label="Seleccionar todo"
                  />
                </th>
              )}

              {columns.map((col) => {
                const isSorted = sort.col === col.key;
                const isSortable = col.sortable !== false;

                return (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className="ui-table__th"
                    data-align={col.align || "left"}
                    data-sortable={isSortable}
                    data-sort={isSorted ? sort.dir : "none"}
                    onClick={isSortable ? () => handleSort(col.key) : undefined}
                    onKeyDown={isSortable ? (e) => handleHeaderKeyDown(e, col.key) : undefined}
                    tabIndex={isSortable ? 0 : undefined}
                    role="columnheader"
                    aria-sort={isSorted ? (sort.dir === "asc" ? "ascending" : "descending") : (isSortable ? "none" : undefined)}
                  >
                    <span className="ui-table__th-content">
                      {col.header}
                      {isSortable && (
                        <span className="ui-table__sort-icon" aria-hidden="true">
                          {isSorted ? (
                            sort.dir === "asc" ? <ArrowUp size={12} strokeWidth={2} /> : <ArrowDown size={12} strokeWidth={2} />
                          ) : (
                            <ArrowUpDown size={12} strokeWidth={1.5} />
                          )}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── Tbody (keyed for cascade re-mount on sort) ── */}
          <tbody key={cascadeKey} className="ui-table__tbody">
            {loading ? (
              /* Skeleton rows */
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`skel_${i}`} className="ui-table__row">
                  {selectable && (
                    <td className="ui-table__td ui-table__td--checkbox">
                      <div className="ui-table__skel" style={{ "--skel-width": "16px" } as CSSProperties} />
                    </td>
                  )}
                  {columns.map((col, ci) => (
                    <td key={col.key} className="ui-table__td" data-align={col.align || "left"}>
                      <div
                        className="ui-table__skel"
                        style={{ "--skel-width": SKELETON_WIDTHS[ci % SKELETON_WIDTHS.length] } as CSSProperties}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              /* Empty state */
              <tr className="ui-table__row">
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="ui-table__td ui-table__td--empty"
                >
                  <p className="ui-table__empty-text">
                    {search ? `Sin resultados para "${search}"` : emptyMessage}
                  </p>
                </td>
              </tr>
            ) : (
              /* Data rows with cascade animation */
              sorted.map((row, index) => {
                const key = getKey(row, index);
                const isSelected = selected.has(key);

                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className="ui-table__row"
                    data-selected={isSelected || undefined}
                    data-clickable={onRowClick ? true : undefined}
                    style={{ "--row-index": index } as CSSProperties}
                  >
                    {selectable && (
                      <td className="ui-table__td ui-table__td--checkbox">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectRow(key, e.target.checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="ui-table__checkbox"
                          aria-label={`Seleccionar fila ${index + 1}`}
                        />
                      </td>
                    )}

                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="ui-table__td"
                        data-align={col.align || "left"}
                      >
                        {col.render(row, index)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}