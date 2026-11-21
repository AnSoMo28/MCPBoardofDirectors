"""
RAG Service — Retrieval-Augmented Generation orchestrator.

The central brain of the Document Intelligence system.
Orchestrates: Query → Hybrid Search → Reranker → Context Build → LLM Generation

Main entry points:
    query_rag()       — Conversational RAG with multi-turn support
    search_documents() — Document search for DocumentRepository UI
    ingest_document()  — Full ingestion pipeline (parse → chunk → embed → store)

All methods are async and production-grade.

Usage:
    rag = RAGService(
        embeddings=EmbeddingService(),
        vectorstore=ChromaVectorStore(),
        search=HybridSearchEngine(...),
        reranker=Reranker(),
        claude=ClaudeService(),
    )
    response = await rag.query_rag("¿Cuál es el presupuesto aprobado?", user_role="admin")
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4

from club_mcp.rag.chunker import SmartChunker, ChunkData
from club_mcp.rag.conversations import ConversationStore
from club_mcp.rag.embeddings import EmbeddingService
from club_mcp.rag.parsers import DocumentParser, CleanDocument
from club_mcp.rag.reranker import Reranker
from club_mcp.rag.search import HybridSearchEngine, SearchResult
from club_mcp.rag.vectorstore import ChromaVectorStore, ROLE_ACCESS

logger = logging.getLogger(__name__)


# ── Response Models ───────────────────────────────────────


@dataclass
class KnowledgeSource:
    """A source cited in a RAG response."""
    document_id: str
    title: str
    snippet: str
    relevance: float
    document_type: str


@dataclass
class RAGResponse:
    """Response from the RAG pipeline."""
    answer: str
    sources: list[KnowledgeSource]
    confidence: float
    conversation_id: str
    processing_ms: int = 0


@dataclass
class SearchResponse:
    """Response from document search."""
    results: list[dict[str, Any]]
    total: int
    query_time_ms: float


# ── RAG System Prompt ─────────────────────────────────────

RAG_SYSTEM_PROMPT = """Eres el asistente de conocimiento del Castillo Country Club.

REGLAS ESTRICTAS:
1. Responde SOLO basándote en los documentos proporcionados en el CONTEXTO DOCUMENTAL.
2. Si la información no está en los documentos, di: "No encontré información sobre eso en la documentación del club."
3. SIEMPRE cita la fuente al final de cada afirmación relevante usando el formato: [Fuente: nombre_del_documento].
4. Si hay información contradictoria entre documentos, señálala y cita ambas fuentes.
5. Para datos numéricos (montos, fechas, porcentajes), reproduce el valor EXACTO del documento.
6. Adapta tu nivel de detalle según el rol del usuario:
   - ADMIN: análisis completo con implicaciones y contexto adicional.
   - JUNTA: resumen ejecutivo con puntos de decisión claros.
   - STAFF: información operativa directa y accionable.
   - SOCIO: lenguaje accesible, solo información pública relevante.
7. Si la pregunta es ambigua, pide clarificación mencionando qué documentos podrían contener la respuesta.
8. Para documentos legales/contractuales, usa terminología precisa y no parafrasees cláusulas.
9. Responde en el mismo idioma de la pregunta.
10. Sé conciso pero completo. Prioriza precisión sobre brevedad."""


# ── RAG Service ───────────────────────────────────────────


class RAGService:
    """
    RAG orchestrator — coordinates all pipeline components.

    Components are injected for testability and flexibility.

    Args:
        embeddings: EmbeddingService instance.
        vectorstore: ChromaVectorStore instance.
        search: HybridSearchEngine instance.
        reranker: Reranker instance.
        claude: ClaudeService instance (optional — enables answer generation).
        chunker: SmartChunker instance (optional — uses defaults).
    """

    def __init__(
        self,
        embeddings: EmbeddingService,
        vectorstore: ChromaVectorStore,
        search: HybridSearchEngine,
        reranker: Reranker,
        claude: Any = None,  # ClaudeService — typed as Any to avoid circular import
        chunker: SmartChunker | None = None,
    ) -> None:
        self._embeddings = embeddings
        self._vectorstore = vectorstore
        self._search = search
        self._reranker = reranker
        self._claude = claude
        self._chunker = chunker or SmartChunker()
        self._conversations = ConversationStore()

    # ══════════════════════════════════════════════════════
    # CORE: Conversational RAG Query
    # ══════════════════════════════════════════════════════

    async def query_rag(
        self,
        question: str,
        user_role: str = "admin",
        conversation_id: str | None = None,
        max_sources: int = 5,
    ) -> RAGResponse:
        """
        Full RAG pipeline: retrieve → rerank → generate answer with citations.

        This is the main entry point for the KnowledgeQuery frontend component.

        Args:
            question: User's natural language question.
            user_role: User role (admin, junta, staff, socio) for access control.
            conversation_id: Existing conversation ID for multi-turn context.
            max_sources: Maximum source documents to cite.

        Returns:
            RAGResponse with answer, sources, confidence, and conversation_id.
        """
        start = time.time()

        # 1. Ensure conversation exists
        if not conversation_id:
            conversation_id = self._conversations.create_session(
                metadata={"user_role": user_role}
            )

        # 2. Add user message to conversation
        self._conversations.add_message(
            conversation_id, "user", question
        )

        # 3. Hybrid search
        candidates = await self._search.search(
            query=question,
            user_role=user_role,
            top_k=20,
        )

        # 4. Populate content from vector store for reranker
        candidates = self._populate_content(candidates)

        # 5. Rerank
        reranked = await self._reranker.rerank(
            query=question,
            candidates=candidates,
            top_k=max_sources * 2,  # Rerank more, return fewer
        )

        # 6. Build context
        context_chunks = reranked[:max_sources]
        context_text = self._build_context(context_chunks)

        # 7. Compute confidence
        confidence = self._compute_confidence(context_chunks)

        # 8. Build sources
        # b0v: RRF scores are bounded by 1/(k+1) per ranking source — with
        # vector-only results (BM25 off) a chunk tops out at ~0.016, so the
        # old absolute floor of 0.05 filtered EVERYTHING. The floor is now
        # relative: half of the best observed score, with 0.01 as an
        # absolute minimum so garbage never passes. Cross-encoder rerank
        # (when active) rewrites final_score to [0,1] and is unaffected.
        best = max((c.final_score for c in context_chunks), default=0.0)
        rel_floor = max(0.01, best / 2) if best > 0 else 0.05
        sources = [
            KnowledgeSource(
                document_id=c.document_id,
                title=c.file_name,
                snippet=c.content[:250] if c.content else "",
                relevance=c.final_score,
                document_type=c.document_type,
            )
            for c in context_chunks
            if c.final_score >= rel_floor
        ]

        # 9. Generate answer with Claude
        answer_text = await self._generate_answer(
            question=question,
            context_text=context_text,
            user_role=user_role,
            conversation_id=conversation_id,
        )

        # 10. Store assistant response
        self._conversations.add_message(
            conversation_id,
            "assistant",
            answer_text,
            sources=[{
                "document_id": s.document_id,
                "title": s.title,
                "relevance": s.relevance,
            } for s in sources],
            confidence=confidence,
        )

        elapsed_ms = int((time.time() - start) * 1000)

        logger.info(
            "[rag] Query '%s': %d candidates → %d sources, confidence=%.2f, %dms",
            question[:50], len(candidates), len(sources), confidence, elapsed_ms,
        )

        return RAGResponse(
            answer=answer_text,
            sources=sources,
            confidence=round(confidence, 3),
            conversation_id=conversation_id,
            processing_ms=elapsed_ms,
        )

    # ══════════════════════════════════════════════════════
    # CORE: Document Search (for DocumentRepository UI)
    # ══════════════════════════════════════════════════════

    async def search_documents(
        self,
        query: str,
        user_role: str = "admin",
        document_types: list[str] | None = None,
        category: str | None = None,
        limit: int = 24,
        offset: int = 0,
    ) -> SearchResponse:
        """
        Search documents for the DocumentRepository UI.

        Returns search results with document metadata, snippets, and highlights.

        Args:
            query: Search query.
            user_role: User role for access control.
            document_types: Filter by document types.
            category: Filter by category.
            limit: Max results.
            offset: Pagination offset.

        Returns:
            SearchResponse with results, total, and query_time_ms.
        """
        start = time.time()

        # Hybrid search with larger pool for deduplication
        candidates = await self._search.search(
            query=query,
            user_role=user_role,
            top_k=limit * 3,
        )

        # Populate content
        candidates = self._populate_content(candidates)

        # Rerank
        reranked = await self._reranker.rerank(
            query=query,
            candidates=candidates,
            top_k=limit + offset,
        )

        # Deduplicate by document_id (keep highest-scoring chunk per document)
        seen_docs: dict[str, SearchResult] = {}
        for result in reranked:
            doc_id = result.document_id
            if doc_id not in seen_docs or result.final_score > seen_docs[doc_id].final_score:
                seen_docs[doc_id] = result

        # Apply document type filter
        if document_types:
            seen_docs = {
                k: v for k, v in seen_docs.items()
                if v.document_type in document_types
            }

        # Paginate
        deduped = list(seen_docs.values())
        total = len(deduped)
        page = deduped[offset:offset + limit]

        # Build response matching frontend DocumentSearchResult shape
        query_terms = query.lower().split()
        results = []
        for r in page:
            snippet = r.content[:300] if r.content else ""
            highlighted = [t for t in query_terms if len(t) > 2]

            results.append({
                "document": {
                    "id": r.document_id,
                    "title": r.file_name,
                    "type": r.document_type,
                    "category": r.category,
                    "status": "published",
                    "tags": r.metadata.get("tags", "").split(", ") if r.metadata.get("tags") else [],
                    "created_by": r.metadata.get("uploaded_by", "system"),
                    "created_at": r.metadata.get("ingested_at", ""),
                    "updated_at": r.metadata.get("ingested_at", ""),
                    "version": 1,
                    "access_roles": ["admin", "junta", "staff"],
                    "file_size_bytes": 0,
                },
                "relevance_score": r.final_score,
                "snippet": snippet,
                "highlighted_terms": highlighted,
            })

        elapsed_ms = round((time.time() - start) * 1000, 1)

        return SearchResponse(
            results=results,
            total=total,
            query_time_ms=elapsed_ms,
        )

    # ══════════════════════════════════════════════════════
    # CORE: Document Ingestion Pipeline
    # ══════════════════════════════════════════════════════

    async def ingest_document(
        self,
        content: bytes,
        file_name: str,
        document_type: str = "",
        category: str = "operational",
        access_level: str = "internal",
        tags: list[str] | None = None,
        uploaded_by: str = "system",
    ) -> dict[str, Any]:
        """
        Full ingestion pipeline: parse → chunk → embed → store.

        Args:
            content: Raw file bytes.
            file_name: Original filename.
            document_type: Document type (auto-detected if empty).
            category: Document category.
            access_level: Access level.
            tags: Optional tags.
            uploaded_by: User who uploaded.

        Returns:
            Dict with document_id, chunk_count, processing details.
        """
        start = time.time()
        from club_mcp.rag.vectorstore import ACCESS_HIERARCHY

        # 1. Parse
        clean_doc = DocumentParser.parse(content, file_name)

        # 2. Chunk
        chunks = self._chunker.chunk(
            clean_doc.content,
            metadata={"file_name": file_name},
        )

        if not chunks:
            return {"status": "error", "message": "No chunks produced from document"}

        # 3. Embed
        embeddings = self._embeddings.embed_documents(
            [c.content for c in chunks],
        )

        # 4. Prepare metadata
        document_id = uuid4().hex[:12]
        tag_list = tags or []

        chunk_ids = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]
        chunk_texts = [c.content for c in chunks]
        chunk_metadatas = [
            {
                "document_id": document_id,
                "file_name": file_name,
                "document_type": document_type or "other",
                "category": category,
                "access_level": ACCESS_HIERARCHY.get(access_level, 1),
                "is_table": c.metadata.is_table,
                "page_number": c.metadata.page_number,
                "section_title": c.metadata.section_title or "",
                "uploaded_by": uploaded_by,
                "tags": ", ".join(tag_list),
            }
            for c in chunks
        ]

        # 5. Store in vector database
        self._vectorstore.add(
            ids=chunk_ids,
            embeddings=embeddings,
            documents=chunk_texts,
            metadatas=chunk_metadatas,
        )

        # 6. Add to BM25 index
        self._search.add_to_index(chunk_ids, chunk_texts, chunk_metadatas)

        elapsed_ms = int((time.time() - start) * 1000)

        logger.info(
            "[rag] Ingested '%s': %d chunks, %d chars, %dms",
            file_name, len(chunks), len(clean_doc.content), elapsed_ms,
        )

        return {
            "status": "success",
            "document_id": document_id,
            "file_name": file_name,
            "chunk_count": len(chunks),
            "content_length": len(clean_doc.content),
            "page_count": clean_doc.metadata.page_count,
            "has_tables": clean_doc.metadata.has_tables,
            "processing_ms": elapsed_ms,
        }
    async def ingest_text(
        self,
        text: str,
        file_name: str,
        document_type: str = "",
        category: str = "operational",
        access_level: str = "internal",
        tags: list[str] | None = None,
        uploaded_by: str = "system",
    ) -> dict[str, Any]:
        """
        Ingest pre-parsed text directly (skip file parsing).

        Used by the MCP agent tool when content is already text.
        For binary file upload, use ingest_document() instead.

        Args:
            text: Pre-parsed text content.
            file_name: Original filename.
            document_type: Semantic document type.
            category: Document category.
            access_level: Access level.
            tags: Optional tags.
            uploaded_by: User who uploaded.

        Returns:
            Dict with document_id, chunk_count, processing details.
        """
        start = time.time()
        from club_mcp.rag.vectorstore import ACCESS_HIERARCHY

        if not text.strip():
            return {"status": "error", "message": "Empty text content"}

        # 1. Chunk
        chunks = self._chunker.chunk(
            text,
            metadata={"file_name": file_name},
        )

        if not chunks:
            return {"status": "error", "message": "No chunks produced from text"}

        # 2. Embed
        embeddings = self._embeddings.embed_documents(
            [c.content for c in chunks],
        )

        # 3. Prepare metadata
        document_id = uuid4().hex[:12]
        tag_list = tags or []

        chunk_ids = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]
        chunk_texts = [c.content for c in chunks]
        chunk_metadatas = [
            {
                "document_id": document_id,
                "file_name": file_name,
                "document_type": document_type or "other",
                "category": category,
                "access_level": ACCESS_HIERARCHY.get(access_level, 1),
                "is_table": c.metadata.is_table,
                "page_number": c.metadata.page_number,
                "section_title": c.metadata.section_title or "",
                "uploaded_by": uploaded_by,
                "tags": ", ".join(tag_list),
            }
            for c in chunks
        ]

        # 4. Store in vector database
        self._vectorstore.add(
            ids=chunk_ids,
            embeddings=embeddings,
            documents=chunk_texts,
            metadatas=chunk_metadatas,
        )

        # 5. Add to BM25 index
        self._search.add_to_index(chunk_ids, chunk_texts, chunk_metadatas)

        elapsed_ms = int((time.time() - start) * 1000)

        logger.info(
            "[rag] Ingested text '%s': %d chunks, %d chars, %dms",
            file_name, len(chunks), len(text), elapsed_ms,
        )

        return {
            "status": "success",
            "document_id": document_id,
            "file_name": file_name,
            "chunk_count": len(chunks),
            "content_length": len(text),
            "page_count": 0,
            "has_tables": any(c.metadata.is_table for c in chunks),
            "processing_ms": elapsed_ms,
        }

    # ══════════════════════════════════════════════════════
    # CORE: Document Deletion
    # ══════════════════════════════════════════════════════

    async def delete_document(self, document_id: str) -> dict[str, Any]:
        """Delete all chunks of a document from vector store and BM25 index."""
        # Vector store
        deleted_chunks = self._vectorstore.delete_by_document(document_id)

        # BM25 index
        deleted_bm25 = self._search.remove_from_index(document_id)

        logger.info(
            "[rag] Deleted document '%s': %d vector chunks, %d BM25 entries",
            document_id, deleted_chunks, deleted_bm25,
        )

        return {
            "status": "success",
            "document_id": document_id,
            "deleted_chunks": deleted_chunks,
        }

    # ══════════════════════════════════════════════════════
    # INTERNAL HELPERS
    # ══════════════════════════════════════════════════════

    def _populate_content(self, candidates: list[SearchResult]) -> list[SearchResult]:
        """
        Populate empty content fields from vector store.

        Search results from hybrid search may not include content
        (depends on ChromaDB include settings).
        """
        ids_needing_content = [c.id for c in candidates if not c.content]

        if not ids_needing_content:
            return candidates

        try:
            stored = self._vectorstore.get_by_ids(ids_needing_content)
            content_map = {item["id"]: item["document"] for item in stored}

            for candidate in candidates:
                if not candidate.content and candidate.id in content_map:
                    candidate.content = content_map[candidate.id]
        except Exception as exc:
            logger.warning("[rag] Could not populate content: %s", exc)

        return candidates

    def populate_content(self, candidates: list[SearchResult]) -> list[SearchResult]:
        """Public wrapper of _populate_content.

        P2-C3h b0v: agents calling search_engine.search() directly get
        SearchResult.content == "" (hybrid search stores only metadata);
        this fills it from the vector store. search_documents() already
        did it internally — direct callers had the gap.
        """
        return self._populate_content(candidates)

    def _build_context(self, chunks: list[SearchResult]) -> str:
        """
        Build context string for LLM from retrieved chunks.

        Format includes source attribution for each chunk.
        """
        if not chunks:
            return "(No se encontraron documentos relevantes)"

        parts: list[str] = []
        for i, chunk in enumerate(chunks, 1):
            source_info = f"[Fuente {i}: {chunk.file_name}]"
            if chunk.metadata.get("section_title"):
                source_info += f" [Sección: {chunk.metadata['section_title']}]"

            parts.append(f"{source_info}\n{chunk.content}")

        return "\n\n---\n\n".join(parts)

    def _compute_confidence(self, chunks: list[SearchResult]) -> float:
        """
        Compute confidence score based on retrieval quality.

        Factors:
        - Max relevance score among results
        - Number of relevant sources found
        - Score distribution (if top result is much better → higher confidence)

        Returns:
            Confidence score between 0.0 and 1.0.
        """
        if not chunks:
            return 0.0

        scores = [c.final_score for c in chunks if c.final_score > 0]
        if not scores:
            return 0.0

        max_score = max(scores)
        num_sources = len(scores)

        # Factor 1: Max score (normalized)
        # Scores from RRF are typically 0.01-0.05, from reranker 0.0-1.0
        # We use max_score directly if from reranker, scale if from RRF
        score_factor = min(1.0, max_score * 5) if max_score < 0.2 else max_score

        # Factor 2: Source count (more sources → higher confidence, diminishing returns)
        source_factor = min(1.0, num_sources / 3)

        # Factor 3: Score gap (top result much better than rest → more confident)
        if len(scores) > 1:
            gap = scores[0] - scores[-1]
            gap_factor = min(1.0, gap * 3)
        else:
            gap_factor = 0.5

        # Weighted combination
        confidence = (
            score_factor * 0.5
            + source_factor * 0.3
            + gap_factor * 0.2
        )

        return min(1.0, max(0.0, confidence))

    async def _generate_answer(
        self,
        question: str,
        context_text: str,
        user_role: str,
        conversation_id: str,
    ) -> str:
        """
        Generate an answer using Claude with RAG context.

        Includes conversation history for multi-turn coherence.
        """
        if self._claude is None:
            return (
                "El servicio de generación de respuestas no está disponible. "
                "Los documentos relevantes se muestran como fuentes."
            )

        # Get conversation context
        history = self._conversations.get_context(conversation_id)

        # Build the full prompt
        user_prompt = f"""CONTEXTO DOCUMENTAL (fragmentos relevantes del repositorio del club):

{context_text}

---

PREGUNTA DEL USUARIO ({user_role.upper()}):
{question}

Responde basándote EXCLUSIVAMENTE en el contexto documental proporcionado. Cita las fuentes."""

        try:
            result = await self._claude.generate(
                system_prompt=RAG_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                max_tokens=2048,
            )

            return result.get("content", "No se pudo generar una respuesta.")

        except Exception as exc:
            logger.error("[rag] Claude generation error: %s", exc)
            return (
                "Ocurrió un error al generar la respuesta. "
                "Los documentos relevantes se muestran como fuentes abajo."
            )

    # ══════════════════════════════════════════════════════
    # PUBLIC: Access for Agent and Advisors
    # ══════════════════════════════════════════════════════

    @property
    def conversations(self) -> ConversationStore:
        """Access conversation store (for agent tools)."""
        return self._conversations

    @property
    def vectorstore(self) -> ChromaVectorStore:
        """Access vector store (for stats, etc.)."""
        return self._vectorstore

    @property
    def search_engine(self) -> HybridSearchEngine:
        """Access search engine (for index management)."""
        return self._search

    def get_stats(self) -> dict[str, Any]:
        """Get aggregated stats from all components."""
        return {
            "vectorstore": self._vectorstore.get_stats(),
            "conversations": self._conversations.get_stats(),
            "bm25_index_size": self._search.index_size,
            "embeddings": self._embeddings.model_info if self._embeddings else {},
            "reranker": self._reranker.model_info,
        }
