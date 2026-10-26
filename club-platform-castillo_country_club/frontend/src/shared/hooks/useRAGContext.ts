// ═══════════════════════════════════════════════════════════
// Castillo Country Club — RAG Context Hook
// F48-A — "The Memory" — Production RAG Integration
//
// Queries the Document Intelligence Agent (ChromaDB + BM25 hybrid)
// and maps results to RAGContext[] for advisor rule enrichment.
//
// Uses `query_documents` (AUTO approval) — lightweight retrieval
// without LLM answer generation. Rules use the raw chunks for
// confidence boosting via combineConfidences(ragGrounded preset).
//
// Architecture:
//   useRAGContext(domain, queries)
//     → callMCPTool("document_intelligence", "query_documents", { query })
//     → map results to RAGContext[]
//     → deduplicate by document_id
//     → return RAGContext[]
//
// Usage in data hook / page:
//   const ragContext = useRAGContext("financial", [
//     "análisis financiero y variaciones presupuestarias",
//   ]);
//   const data = useFinanceData({ ragContext });
//
// Rules: #19 (data query, not AI — auto-load with long staleTime),
//        P62 (RAG Context Injection), P49 (normalizeEnums not needed).
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useMCPQuery } from "./useMCPQuery";
import type { RAGContext } from "@/shared/lib/advisor-engine/types";

// ── Domain → RAG Query Mapping ─────────────────────────────

export const DOMAIN_RAG_QUERIES: Record<string, string[]> = {
  global: [
    "estrategia del club, retención de socios, riesgos operativos y programas de fidelización",
  ],
  financial: [
    "análisis financiero, presupuestos, variaciones de costos y concentración de ingresos",
  ],
  events: [
    "planificación de eventos, asistencia, calendario social y programas del club",
  ],
  satisfaction: [
    "encuestas de satisfacción, feedback de socios, NPS y programas de mejora de experiencia",
  ],
  guest: [
    "programa de invitados, membresías trial, conversión y referidos de socios",
  ],
  communications: [
    "comunicaciones internas, campañas de socios, notificaciones y engagement digital",
  ],
  sports: [
    "actividades deportivas, torneos, clases, utilización de canchas y equipamiento",
  ],
  family: [
    "programas familiares, actividades por grupo etario, retención juvenil y engagement familiar",
  ],
  recommendations: [
    "recomendaciones estratégicas, pricing, nuevas actividades y optimización de servicios",
  ],
  ml: [
    "modelos predictivos, calidad de datos, segmentación de socios y anomalías operacionales",
  ],
};

// ── MCP Response Type ──────────────────────────────────────

interface QueryDocumentsResult {
  chunk_id: string;
  document_id: string;
  document_name: string;
  content: string;
  relevance_score: number;
  chunk_index: number;
  section_title: string;
}

interface QueryDocumentsResponse {
  status: string;
  message: string;
  results: QueryDocumentsResult[];
  total_results: number;
}

// ── Mapper ─────────────────────────────────────────────────

function mapResultsToRAGContext(
  results: QueryDocumentsResult[],
): RAGContext[] {
  // Deduplicate by document_id — keep highest relevance per doc
  const byDoc = new Map<string, QueryDocumentsResult[]>();
  for (const r of results) {
    const group = byDoc.get(r.document_id) ?? [];
    group.push(r);
    byDoc.set(r.document_id, group);
  }

  return Array.from(byDoc.entries()).map(([docId, chunks]) => ({
    source: chunks[0].document_name,
    relevance: Math.max(...chunks.map((c) => c.relevance_score)),
    content: chunks.map((c) => c.content).join("\n\n"),
    citationCount: chunks.length,
    documentIds: [docId],
    metadata: {
      section_titles: chunks.map((c) => c.section_title).filter(Boolean),
      chunk_ids: chunks.map((c) => c.chunk_id),
    },
  }));
}

// ── Options ────────────────────────────────────────────────

export interface UseRAGContextOptions {
  /** Enable/disable RAG queries (default: true) */
  enabled?: boolean;
  /** Override staleTime (default: 600_000 = 10 min — docs don't change often) */
  staleTime?: number;
  /** Max results per query (default: 5) */
  limit?: number;
}

// ── Hook ───────────────────────────────────────────────────

/**
 * Retrieve RAG context for a specific domain.
 * Queries the Document Intelligence Agent for relevant documents.
 *
 * @param domain — Domain identifier (maps to predefined queries)
 * @param customQueries — Override default domain queries
 * @param options — Query options
 * @returns RAGContext[] for enrichment of advisor rules
 */
export function useRAGContext(
  domain: string,
  customQueries?: string[],
  options: UseRAGContextOptions = {},
): RAGContext[] {
  const {
    enabled = true,
    staleTime = 600_000,
    limit = 5,
  } = options;

  const queries = customQueries ?? DOMAIN_RAG_QUERIES[domain] ?? [];

  // Query 1 (always present if domain has defined queries)
  const q1 = useMCPQuery<QueryDocumentsResponse>(
    "document_intelligence",
    "query_documents",
    { query: queries[0] ?? "", limit },
    { staleTime, enabled: enabled && queries.length > 0 },
  );

  // Query 2 (optional — second domain query)
  const q2 = useMCPQuery<QueryDocumentsResponse>(
    "document_intelligence",
    "query_documents",
    { query: queries[1] ?? "", limit },
    { staleTime, enabled: enabled && queries.length > 1 },
  );

  // Combine + deduplicate + map to RAGContext
  return useMemo(() => {
    const allResults: QueryDocumentsResult[] = [];

    if (q1.data?.results?.length) {
      allResults.push(...q1.data.results);
    }
    if (q2.data?.results?.length) {
      allResults.push(...q2.data.results);
    }

    if (allResults.length === 0) return [];

    return mapResultsToRAGContext(allResults);
  }, [q1.data, q2.data]);
}