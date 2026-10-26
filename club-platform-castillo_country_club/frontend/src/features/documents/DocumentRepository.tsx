/**
 * @component DocumentRepository (Fase 25 — REWRITE)
 * @namespace .glass-docs
 * @depends useDocumentSearch, DocumentCard, TypeChip, DocumentCardSkeleton,
 *          DocumentRepository.css
 * @note Full rewrite from 380-line monolith to orchestrator with hook + 3 sub-components.
 *       URL sync, Ctrl+K shortcut, sort, "load more" pagination,
 *       CSS co-locado, card keyboard nav.
 *       Backward-compatible: same default export, same route.
 * @import import './DocumentRepository.css';
 */

import { AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  AlertCircle,
  FileText,
} from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui";
import { FilterDropdown } from "@/shared/components/ui/FilterDropdown";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { DOCUMENT_TYPE_CONFIG } from "@/features/documents/types";
import type { DocumentType } from "@/features/documents/types";
import { useDocumentSearch } from "./hooks/useDocumentSearch";
import { TypeChip } from "./docs/TypeChip";
import { DocumentCard } from "./docs/DocumentCard";
import { DocumentCardSkeleton } from "./docs/DocumentCardSkeleton";
import "./DocumentRepository.css";

/* ═══════════════════════════════════════
   Constants
   ═══════════════════════════════════════ */

const ALL_TYPES = Object.keys(DOCUMENT_TYPE_CONFIG) as DocumentType[];

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevancia" },
  { value: "date", label: "Más recientes" },
  { value: "type", label: "Tipo" },
] as const;

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function DocumentRepository() {
  const doc = useDocumentSearch();
  const reducedMotion = useReducedMotion();

  /* ── Filter options from config ── */
  const filterOptions = ALL_TYPES.map((type) => ({
    value: type,
    label: DOCUMENT_TYPE_CONFIG[type].label,
    color: DOCUMENT_TYPE_CONFIG[type].color,
  }));

  return (
    <PageContainer
      title="Documentación del Club"
      subtitle="Base de conocimiento central del Castillo Country Club"
      breadcrumbs={[
        { label: "Dashboard", href: "/admin/dashboard" },
        { label: "Documentación" },
      ]}
    >
      {/* ── Search bar ── */}
      <div
        className="glass-docs__search"
        role="search"
        aria-label="Buscar documentos"
      >
        <label htmlFor="doc-search" className="sr-only">
          Buscar documentos
        </label>
        <Search className="glass-docs__search-icon" />
        <input
          ref={doc.searchRef}
          id="doc-search"
          type="text"
          value={doc.searchInput}
          onChange={(e) => doc.setSearchInput(e.target.value)}
          placeholder="Buscar en la documentación del club..."
          className="glass-docs__search-input"
        />
        {!doc.searchInput && (
          <span className="glass-docs__search-hint" aria-hidden="true">
            ⌘K
          </span>
        )}
        {doc.searchInput && (
          <button
            type="button"
            onClick={() => doc.setSearchInput("")}
            className="glass-docs__search-clear"
            aria-label="Limpiar búsqueda"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Filter bar ── */}
      <div className="glass-docs__filters">
        <FilterDropdown
          label="Tipo de documento"
          selected={doc.activeTypes}
          options={filterOptions}
          onChange={doc.setActiveTypes}
          multiple
          clearLabel="Todos los tipos"
        />

        {/* Sort */}
        <select
          className="glass-docs__sort-select"
          value={doc.sortField}
          onChange={(e) =>
            doc.setSortField(
              e.target.value as "relevance" | "date" | "type",
            )
          }
          aria-label="Ordenar resultados"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Selected type chips */}
        <AnimatePresence>
          {doc.activeTypes.map((type) => (
            <TypeChip
              key={type}
              type={type as DocumentType}
              onRemove={() => doc.removeType(type)}
              reducedMotion={reducedMotion}
            />
          ))}
        </AnimatePresence>

        {doc.activeTypes.length > 0 && (
          <button
            type="button"
            onClick={doc.clearTypes}
            className="glass-docs__clear-all"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* ── Results summary ── */}
      {doc.total > 0 && (
        <div className="glass-docs__summary">
          <span className="glass-docs__summary-count">{doc.total}</span>
          {doc.total === 1 ? "documento" : "documentos"}
          {doc.searchInput && (
            <>
              {" "}
              para{" "}
              <span className="glass-docs__summary-query">
                &ldquo;{doc.searchInput}&rdquo;
              </span>
            </>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {doc.error && !doc.results.length && (
        <EmptyState
          icon={
            <AlertCircle className="w-8 h-8 text-[var(--color-rose-400)]" />
          }
          title="Error al buscar"
          description="No se pudo conectar con el servidor de documentos. Intentá de nuevo."
          action={
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
              icon={<Search className="w-4 h-4" />}
            >
              Reintentar
            </Button>
          }
        />
      )}

      {/* ── Loading ── */}
      {doc.isLoading && (
        <div className="glass-docs__grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <DocumentCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* ── Results grid ── */}
      {!doc.isLoading && doc.results.length > 0 && (
        <>
          <div
            className={cn(
              "glass-docs__grid",
              doc.isFetching && "glass-docs__grid--fetching",
            )}
          >
            {doc.results.map((result, index) => (
              <DocumentCard
                key={result.document.id}
                result={result}
                index={index}
                reducedMotion={reducedMotion}
              />
            ))}
          </div>

          {/* ── Load more ── */}
          {doc.hasMore && (
            <div className="glass-docs__load-more">
              <button
                type="button"
                className="glass-docs__load-more-btn"
                onClick={doc.loadMore}
              >
                Ver más ({doc.total - doc.results.length} documentos
                restantes)
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Empty ── */}
      {!doc.isLoading &&
        !doc.error &&
        doc.results.length === 0 &&
        !doc.isFetching && (
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title="Sin resultados"
            description={
              doc.searchInput
                ? `No se encontraron documentos para "${doc.searchInput}". Probá con otros términos.`
                : "Aún no hay documentos cargados en el sistema."
            }
            action={
              doc.searchInput ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    doc.setSearchInput("");
                    doc.clearTypes();
                  }}
                  icon={<X className="w-4 h-4" />}
                >
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        )}
    </PageContainer>
  );
}

export default DocumentRepository;