"""
Document intelligence repository (RAG).

Dual storage:
  - In-memory: document metadata + reports (project pattern)
  - ChromaDB: vector embeddings + chunk content (RAG pipeline)
  - BM25 index: keyword search (hybrid search component)

The RAG service is initialized lazily on first use.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from club_mcp.models.document_intelligence import (
    ACCESS_HIERARCHY,
    CreateDocument,
    CreateKnowledgeReport,
    Document,
    DocumentAccessLevel,
    DocumentCategory,
    DocumentStatus,
    DocumentType,
    IngestionStatus,
    KnowledgeReport,
)

logger = logging.getLogger(__name__)


class DocumentIntelligenceRepository:
    """
    Repository for document metadata and reports.

    Delegates RAG operations (search, query, ingest) to RAGService.
    Keeps document metadata and reports in-memory (project pattern).

    Args:
        claude_service: ClaudeService for RAG answer generation (optional).
    """

    def __init__(self, claude_service: Any = None) -> None:
        self._documents: dict[str, dict] = {}
        self._reports: dict[str, dict] = {}
        self._claude_service = claude_service
        self._rag_service: Any = None  # Lazy init

    # ══════════════════════════════════════════════════════
    # RAG SERVICE (lazy initialization)
    # ══════════════════════════════════════════════════════

    @property
    def rag(self) -> Any:
        """
        Lazy-initialized RAG service.

        Models are loaded on first access (~5-10s for embeddings + reranker).
        Subsequent access is instant.
        """
        if self._rag_service is None:
            self._rag_service = self._build_rag_service()
        return self._rag_service

    def _build_rag_service(self) -> Any:
        """Build and connect all RAG components."""
        from club_mcp.rag.embeddings import EmbeddingService
        from club_mcp.rag.vectorstore import ChromaVectorStore
        from club_mcp.rag.search import HybridSearchEngine
        from club_mcp.rag.reranker import Reranker
        from club_mcp.rag.rag_service import RAGService

        embeddings = EmbeddingService()
        vectorstore = ChromaVectorStore()
        search = HybridSearchEngine(embeddings, vectorstore)
        reranker = Reranker()

        logger.info("[doc_repo] Initializing RAG service (models loading...)")

        return RAGService(
            embeddings=embeddings,
            vectorstore=vectorstore,
            search=search,
            reranker=reranker,
            claude=self._claude_service,
        )

    # ══════════════════════════════════════════════════════
    # DOCUMENT METADATA CRUD (in-memory)
    # ══════════════════════════════════════════════════════

    async def create_document(self, data: CreateDocument) -> Document:
        """Create a document metadata entry (not the content — that's RAG)."""
        doc_id = uuid4().hex[:12]
        now = datetime.now(tz=timezone.utc).isoformat()

        record = {
            "id": doc_id,
            "title": data.title or data.file_name,
            "file_name": data.file_name,
            "document_type": data.document_type.value,
            "category": data.category.value,
            "access_level": data.access_level.value,
            "status": DocumentStatus.DRAFT.value,
            "ingestion_status": IngestionStatus.INDEXED.value,
            "tags": data.tags,
            "chunk_count": 0,
            "content_preview": "",
            "file_size_bytes": 0,
            "page_count": 0,
            "has_tables": False,
            "uploaded_by": data.uploaded_by,
            "notes": data.notes,
            "version": 1,
            "created_at": now,
            "updated_at": now,
        }
        self._documents[doc_id] = record

        logger.info("[doc_repo] Document metadata created: %s (%s)", data.file_name, doc_id)
        return Document(**record)

    async def get_document(self, doc_id: str) -> Optional[Document]:
        """Get document metadata by ID."""
        record = self._documents.get(doc_id)
        if not record:
            return None
        return Document(**record)

    async def list_documents(
        self,
        category: str = "",
        document_type: str = "",
        access_level: str = "",
        status: str = "",
    ) -> list[Document]:
        """List document metadata with optional filters."""
        results = list(self._documents.values())
        if category:
            results = [d for d in results if d["category"] == category]
        if document_type:
            results = [d for d in results if d["document_type"] == document_type]
        if access_level:
            results = [d for d in results if d["access_level"] == access_level]
        if status:
            results = [d for d in results if d["status"] == status]
        return [Document(**d) for d in results]

    async def update_document(self, doc_id: str, updates: dict) -> Optional[Document]:
        """Update document metadata."""
        record = self._documents.get(doc_id)
        if not record:
            return None
        record.update(updates)
        record["updated_at"] = datetime.now(tz=timezone.utc).isoformat()
        return Document(**record)

    async def delete_document(self, doc_id: str) -> bool:
        """Delete document metadata and RAG data."""
        if doc_id not in self._documents:
            return False

        # Delete from RAG (ChromaDB + BM25)
        try:
            await self.rag.delete_document(doc_id)
        except Exception as exc:
            logger.warning("[doc_repo] RAG delete failed for '%s': %s", doc_id, exc)

        # Delete metadata
        del self._documents[doc_id]
        logger.info("[doc_repo] Document deleted: %s", doc_id)
        return True

    # ══════════════════════════════════════════════════════
    # RAG DELEGATION
    # ══════════════════════════════════════════════════════

    async def search_documents_rag(
        self,
        query: str,
        user_role: str = "admin",
        document_types: list[str] | None = None,
        category: str | None = None,
        limit: int = 24,
        offset: int = 0,
    ) -> dict[str, Any]:
        """Delegate document search to RAG service."""
        response = await self.rag.search_documents(
            query=query,
            user_role=user_role,
            document_types=document_types,
            category=category,
            limit=limit,
            offset=offset,
        )
        return {
            "status": "success",
            "results": response.results,
            "total": response.total,
            "query_time_ms": response.query_time_ms,
        }

    async def query_knowledge(
        self,
        question: str,
        user_role: str = "admin",
        conversation_id: str | None = None,
        max_sources: int = 5,
    ) -> dict[str, Any]:
        """Delegate RAG conversational query to RAG service."""
        response = await self.rag.query_rag(
            question=question,
            user_role=user_role,
            conversation_id=conversation_id,
            max_sources=max_sources,
        )
        return {
            "status": "success",
            "answer": response.answer,
            "sources": [
                {
                    "document_id": s.document_id,
                    "title": s.title,
                    "snippet": s.snippet,
                    "relevance": s.relevance,
                    "document_type": s.document_type,
                }
                for s in response.sources
            ],
            "confidence": response.confidence,
            "conversation_id": response.conversation_id,
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
        notes: str = "",
    ) -> dict[str, Any]:
        """
        Ingest pre-parsed text into RAG + create metadata entry.

        For file upload (binary), use RAG service directly via upload endpoint.
        """
        # 1. RAG ingest
        rag_result = await self.rag.ingest_text(
            text=text,
            file_name=file_name,
            document_type=document_type,
            category=category,
            access_level=access_level,
            tags=tags,
            uploaded_by=uploaded_by,
        )

        if rag_result.get("status") != "success":
            return rag_result

        # 2. Create metadata entry
        try:
            doc_type = DocumentType(document_type) if document_type else DocumentType.OTHER
        except ValueError:
            doc_type = DocumentType.OTHER

        try:
            cat = DocumentCategory(category)
        except ValueError:
            cat = DocumentCategory.OPERATIONAL

        try:
            acc = DocumentAccessLevel(access_level)
        except ValueError:
            acc = DocumentAccessLevel.INTERNAL

        now = datetime.now(tz=timezone.utc).isoformat()
        doc_id = rag_result.get("document_id", uuid4().hex[:12])

        needs_review = doc_type in (DocumentType.CONTRACT, DocumentType.BYLAW)

        record = {
            "id": doc_id,
            "title": file_name,
            "file_name": file_name,
            "document_type": doc_type.value,
            "category": cat.value,
            "access_level": acc.value,
            "status": DocumentStatus.DRAFT.value if needs_review else DocumentStatus.PUBLISHED.value,
            "ingestion_status": IngestionStatus.PENDING_REVIEW.value if needs_review else IngestionStatus.INDEXED.value,
            "tags": tags or [],
            "chunk_count": rag_result.get("chunk_count", 0),
            "content_preview": text[:200] if text else "",
            "file_size_bytes": len(text.encode("utf-8")),
            "page_count": rag_result.get("page_count", 0),
            "has_tables": rag_result.get("has_tables", False),
            "uploaded_by": uploaded_by,
            "notes": notes,
            "version": 1,
            "created_at": now,
            "updated_at": now,
        }
        self._documents[doc_id] = record

        logger.info("[doc_repo] Ingested '%s' — %d chunks, metadata created", file_name, rag_result.get("chunk_count", 0))

        return {
            **rag_result,
            "document": record,
        }

    async def search_similar_rag(
        self,
        document_id: str,
        limit: int = 5,
    ) -> dict[str, Any]:
        """Find similar documents using vector similarity."""
        # Get some chunks from the source document
        source_chunks = self.rag.vectorstore.query(
            embedding=self.rag._embeddings.embed_query(""),  # Empty query → get any chunks
            n_results=1,
            where={"document_id": document_id},
        )

        if not source_chunks:
            # Fallback: use document metadata
            doc = await self.get_document(document_id)
            if not doc:
                return {"status": "not_found", "similar_documents": []}
            # Search by document title
            search_result = await self.rag.search_documents(
                query=doc.title or doc.file_name,
                limit=limit + 1,
            )
            similar = [
                r for r in search_result.results
                if r.document.id != document_id
            ][:limit]
            return {
                "status": "success",
                "source_document": doc.file_name,
                "similar_documents": [
                    {"document_id": s.document.id, "file_name": s.document.title,
                     "similarity_score": s.relevance_score}
                    for s in similar
                ],
            }

        # Use the source document's embedding to find similar
        source_embedding = self.rag._embeddings.embed_query(
            source_chunks[0]["document"][:500]
        )

        results = self.rag.vectorstore.query(
            embedding=source_embedding,
            n_results=limit * 3,
        )

        # Deduplicate by document_id, exclude source
        seen: dict[str, float] = {}
        for r in results:
            doc_id = r["metadata"].get("document_id", "")
            if doc_id == document_id or not doc_id:
                continue
            if doc_id not in seen or r["score"] > seen[doc_id]:
                seen[doc_id] = r["score"]

        similar = []
        for doc_id, score in sorted(seen.items(), key=lambda x: x[1], reverse=True)[:limit]:
            meta = next(
                (r["metadata"] for r in results if r["metadata"].get("document_id") == doc_id),
                {},
            )
            similar.append({
                "document_id": doc_id,
                "file_name": meta.get("file_name", ""),
                "document_type": meta.get("document_type", ""),
                "category": meta.get("category", ""),
                "similarity_score": round(score, 4),
            })

        doc = await self.get_document(document_id)
        return {
            "status": "success",
            "source_document": doc.file_name if doc else document_id,
            "similar_documents": similar,
        }

    # ══════════════════════════════════════════════════════
    # REPORTS CRUD (in-memory)
    # ══════════════════════════════════════════════════════

    async def create_report(self, data: CreateKnowledgeReport) -> KnowledgeReport:
        """Create a knowledge report."""
        report_id = uuid4().hex[:8]
        now = datetime.now(tz=timezone.utc).isoformat()
        record = {
            "id": report_id,
            **data.model_dump(),
            "status": "draft",
            "created_at": now,
            "updated_at": now,
        }
        self._reports[report_id] = record
        logger.info("[doc_repo] Knowledge report created: %s (%s)", data.topic, report_id)
        return KnowledgeReport(**record)

    async def get_report(self, report_id: str) -> Optional[KnowledgeReport]:
        record = self._reports.get(report_id)
        if not record:
            return None
        return KnowledgeReport(**record)

    async def list_reports(self, audience: str = "", status: str = "") -> list[KnowledgeReport]:
        results = list(self._reports.values())
        if audience:
            results = [r for r in results if r["audience"] == audience]
        if status:
            results = [r for r in results if r["status"] == status]
        return [KnowledgeReport(**r) for r in results]

    async def update_report(self, report_id: str, updates: dict) -> Optional[KnowledgeReport]:
        record = self._reports.get(report_id)
        if not record:
            return None
        record.update(updates)
        record["updated_at"] = datetime.now(tz=timezone.utc).isoformat()
        return KnowledgeReport(**record)

    # ══════════════════════════════════════════════════════
    # STATS
    # ══════════════════════════════════════════════════════

    async def get_stats(self) -> dict[str, Any]:
        """Aggregated stats from in-memory metadata + RAG vector store."""
        docs = list(self._documents.values())
        by_type: dict[str, int] = {}
        by_category: dict[str, int] = {}
        by_access: dict[str, int] = {}
        total_size = 0

        for d in docs:
            t = d["document_type"]
            by_type[t] = by_type.get(t, 0) + 1
            c = d["category"]
            by_category[c] = by_category.get(c, 0) + 1
            a = d["access_level"]
            by_access[a] = by_access.get(a, 0) + 1
            total_size += d.get("file_size_bytes", 0)

        metadata_stats = {
            "total_documents": len(docs),
            "total_chunks": sum(d.get("chunk_count", 0) for d in docs),
            "total_size_bytes": total_size,
            "by_type": by_type,
            "by_category": by_category,
            "by_access_level": by_access,
        }

        # Merge with RAG stats (vector store, BM25, conversations)
        try:
            rag_stats = self.rag.get_stats()
            return {
                **metadata_stats,
                "rag": rag_stats,
            }
        except Exception as exc:
            logger.warning("[doc_repo] Could not get RAG stats: %s", exc)
            return metadata_stats
