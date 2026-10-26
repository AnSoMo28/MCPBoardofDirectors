/**
 * @hook useDocumentSearch (Fase 25)
 * @module features/documents/hooks
 * @exports useDocumentSearch, type SortField
 * @note Search, debounce, multi-type filter, sort, pagination (limit-based),
 *       URL sync (q, types, sort), Ctrl+K shortcut.
 */

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useSearchParams } from "react-router";
import { keepPreviousData } from "@tanstack/react-query";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import type {
  DocumentSearchResponse,
  DocumentSearchResult,
} from "@/features/documents/types";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

export type SortField = "relevance" | "date" | "type";

export interface UseDocumentSearchReturn {
  /* Search */
  searchInput: string;
  setSearchInput: (v: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  /* Filters */
  activeTypes: string[];
  setActiveTypes: (types: string[]) => void;
  removeType: (type: string) => void;
  clearTypes: () => void;
  /* Sort */
  sortField: SortField;
  setSortField: (s: SortField) => void;
  /* Results */
  results: DocumentSearchResult[];
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  /* Pagination */
  hasMore: boolean;
  loadMore: () => void;
  isLimitReached: boolean;
}

/* ═══════════════════════════════════════
   Constants
   ═══════════════════════════════════════ */

const PAGE_SIZE = 24;
const DEBOUNCE_MS = 350;

/* ═══════════════════════════════════════
   Hook
   ═══════════════════════════════════════ */

export function useDocumentSearch(): UseDocumentSearchReturn {
  /* ── URL sync: read initial values ── */
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialTypes = (searchParams.get("types") || "")
    .split(",")
    .filter(Boolean);
  const initialSort =
    (searchParams.get("sort") as SortField) || "relevance";

  /* ── State ── */
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [activeTypes, setActiveTypes] = useState<string[]>(initialTypes);
  const [sortField, setSortField] = useState<SortField>(initialSort);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const searchRef = useRef<HTMLInputElement | null>(null);

  /* ── Debounce ── */
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedQuery(searchInput),
      DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [searchInput]);

  /* ── Reset limit on filter/search/sort change ── */
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [debouncedQuery, activeTypes, sortField]);

  /* ── URL sync: write when values change ── */
  useEffect(() => {
    const params: Record<string, string> = {};
    if (debouncedQuery) params.q = debouncedQuery;
    if (activeTypes.length > 0) params.types = activeTypes.join(",");
    if (sortField !== "relevance") params.sort = sortField;
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, activeTypes, sortField]);

  /* ── Ctrl+K shortcut ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  /* ── MCP query ── */
  const { data, isLoading, isFetching, error } =
    useMCPQuery<DocumentSearchResponse>(
      "document_intelligence",
      "search_documents",
      {
        query: debouncedQuery,
        document_types:
          activeTypes.length > 0 ? activeTypes : undefined,
        sort_by: sortField !== "relevance" ? sortField : undefined,
        limit,
      },
      {
        staleTime: 30_000,
        placeholderData: keepPreviousData,
      },
    );

  /* ── Client-side sort fallback ── */
  const results = useMemo<DocumentSearchResult[]>(() => {
    const items = data?.results ?? [];
    switch (sortField) {
      case "date":
        return [...items].sort(
          (a, b) =>
            new Date(b.document.updated_at).getTime() -
            new Date(a.document.updated_at).getTime(),
        );
      case "type":
        return [...items].sort((a, b) =>
          a.document.type.localeCompare(b.document.type),
        );
      default:
        return items; /* relevance — MCP default order */
    }
  }, [data, sortField]);

  const total = data?.total ?? 0;
  const hasMore = total > limit;
  const isLimitReached = limit >= 200; /* safety cap */

  /* ── Actions ── */
  const removeType = useCallback((type: string) => {
    setActiveTypes((prev) => prev.filter((t) => t !== type));
  }, []);

  const clearTypes = useCallback(() => {
    setActiveTypes([]);
  }, []);

  const loadMore = useCallback(() => {
    if (!isLimitReached) {
      setLimit((prev) => prev + PAGE_SIZE);
    }
  }, [isLimitReached]);

  return {
    searchInput,
    setSearchInput,
    searchRef,
    activeTypes,
    setActiveTypes,
    removeType,
    clearTypes,
    sortField,
    setSortField,
    results,
    total,
    isLoading,
    isFetching,
    error: error as Error | null,
    hasMore,
    loadMore,
    isLimitReached,
  };
}