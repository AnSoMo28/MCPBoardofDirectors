"""DocumentIntelligenceRepository ORM async — los 2 dicts se vuelven tablas.

Ola 2.1-decimoctava (vertical document_intelligence). Contrato EXACTO
del módulo in-memory que reemplaza (club_mcp.db.repositories.
document_intelligence_repo): mismos 17 métodos públicos + 2
properties (rag · rag_service_ready), mismas firmas, mismos Pydantic
de salida, mismo comportamiento de error (None / lista vacía /
dicts con defaults — el in-memory no define excepciones custom y el
ORM tampoco las inventa).

La decimoctava NO es un repo de datos puro: además de los 2 dicts
(_documents · _reports) posee el pipeline RAG completo (build_vectorstore
+ HybridSearchEngine + Reranker, lazy). La Ola 2.2 ya migró el
vectorstore (pgvector · rag_chunks) — este repo conserva la MISMA
construcción lazy del in-memory y delega en la factory de 2.2: el
pipeline NO se duplica, se hereda. El agente ya solo consume públicos
(refactor 0055: 7 túneles → contrato) — este repo implementa ese
contrato.

Mismas decisiones que las 17 verticales (§3.8..§3.8-DECIMASEPTIMA):
engine por inyección · session_scope transaccional · devuelve
Pydantic (SQLAlchemy no sube) · ids de la MISMA forma que el
in-memory (uuid4().hex[:12] documentos · uuid4().hex[:8] reports).

Semántica literal del in-memory que se preserva:
  * create_document: id/created_at/updated_at los fija el REPO ·
    status DRAFT · ingestion INDEXED · chunk_count 0 · version 1
    literales del create.
  * ingest_text: enums con fallback (CONTRACT/BYLAW → PENDING_REVIEW
    · resto INDEXED; INVALID → OTHER/OPERATIONAL/INTERNAL) ·
    doc_id = rag_result.document_id con fallback uuid4 hex12 ·
    content_preview text[:200] · file_size_bytes len(text.encode()).
  * update_document/update_report: record.update(updates) MISMA
    semántica de dict plano (keys ORM conocidas se aplican, updated_at
    SIEMPRE) · update NUNCA toca created_at (el in-memory tampoco —
    dict.update no lo borra, solo lo pisa si llega en updates).
  * delete_document: best-effort RAG delete (warning log + sigue) ·
    metadata del delete SIEMPRE.
  * list_documents/list_reports: filtros en Python · MISMO orden de
    inserción (order_by(id) siempre explícito — lección run #56).
  * create_report: status "draft" literal · {id, **model_dump(),
    created_at, updated_at} MISMA forma.
  * get_stats: by_type/by_category/by_access/total_* compute-on-read
    byte a byte · merge rag.get_stats() best-effort (except →
    metadata_stats solos, MISMO fallback del in-memory).
  * RAG delegation (search_documents_rag · query_knowledge ·
    query_knowledge_rag · search_chunks · search_similar_rag ·
    update_access_metadata): MISMA delegación del in-memory (la
    property rag lazy la construye IGUAL).
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import select

from club_mcp.db.orm.document_intelligence_orm import (
    DocumentORM,
    KnowledgeReportORM,
)
from club_mcp.db.orm.session import session_scope
from club_mcp.models.document_intelligence import (
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


def _now_iso() -> str:
    return datetime.now(tz=UTC).isoformat()


async def _next_seq(engine: Any, orm_cls: Any) -> int:
    """seq monótona por tabla: max(seq)+1 (canon de orden de inserción).

    El in-memory iteraba .values() en orden de inserción; los ids de
    este dominio son uuid4 ALEATORIOS (sin prefijo, a diferencia de
    las 17 verticales) — seq es la columna técnica que replica ese
    orden observable (lección run #56 aplicada a dominio sin prefijo).
    NO es contractual: no sube al Pydantic ni la tocan los updates.
    """
    async with session_scope(engine) as s:
        row = (await s.execute(select(orm_cls.seq).order_by(orm_cls.seq.desc()).limit(1))).scalar_one_or_none()
        return (row or 0) + 1


def _doc_from_orm(d: DocumentORM) -> Document:
    """DocumentORM → Document Pydantic (enum coercion del borde)."""
    return Document(
        id=d.id,
        title=d.title,
        file_name=d.file_name,
        document_type=DocumentType(d.document_type),
        category=DocumentCategory(d.category),
        access_level=DocumentAccessLevel(d.access_level),
        status=DocumentStatus(d.status),
        ingestion_status=IngestionStatus(d.ingestion_status),
        tags=list(d.tags or []),
        chunk_count=d.chunk_count,
        content_preview=d.content_preview,
        file_size_bytes=d.file_size_bytes,
        page_count=d.page_count,
        has_tables=d.has_tables,
        uploaded_by=d.uploaded_by,
        notes=d.notes,
        version=d.version,
        created_at=d.created_at or "",
        updated_at=d.updated_at or "",
    )


def _report_from_orm(r: KnowledgeReportORM) -> KnowledgeReport:
    """KnowledgeReportORM → KnowledgeReport Pydantic."""
    return KnowledgeReport(
        id=r.id,
        topic=r.topic,
        audience=r.audience,
        summary=r.summary,
        source_documents=list(r.source_documents or []),
        key_findings=list(r.key_findings or []),
        date_from=r.date_from,
        date_to=r.date_to,
        categories=list(r.categories or []),
        status=r.status,
        created_at=r.created_at or "",
        updated_at=r.updated_at or "",
    )


# Keys ORM válidas para updates de dict plano (el in-memory aplicaba
# record.update(updates) sobre el MISMO shape del dict; el ORM aplica
# solo las keys de columna — una key desconocida se ignora con el
# MISMO observable que el in-memory (que la guardaba y Document(**record)
# ignora en Pydantic... NO: Pydantic extra=forbid no está activo,
# model_config extra=default ignore). Espejo del observable.
_DOC_COLS = frozenset(
    {
        "title", "file_name", "document_type", "category",
        "access_level", "status", "ingestion_status", "tags",
        "chunk_count", "content_preview", "file_size_bytes",
        "page_count", "has_tables", "uploaded_by", "notes", "version",
        "created_at", "updated_at",
    }
)
_REPORT_COLS = frozenset(
    {
        "topic", "audience", "summary", "source_documents",
        "key_findings", "date_from", "date_to", "categories",
        "status", "created_at", "updated_at",
    }
)


class DocumentIntelligenceRepository:
    """Repo ORM async del dominio Document Intelligence — contrato EXACTO."""

    def __init__(self, engine: Any = None, claude_service: Any = None) -> None:
        # Firma del in-memory (claude_service kw) + engine del swap (patrón
        # de las 17: el bootstrap inyecta el engine persistente).
        self._engine = engine
        self._claude_service = claude_service
        self._rag_service: Any = None  # Lazy init (idéntico al in-memory)

    # ══════════════════════════════════════════════════════
    # RAG SERVICE (lazy initialization — idéntico al in-memory)
    # ══════════════════════════════════════════════════════

    @property
    def rag(self) -> Any:
        """
        Lazy-initialized RAG service (idéntico al in-memory).

        Models are loaded on first access (~5-10s for embeddings +
        reranker). Subsequent access is instant. La Ola 2.2 ya migró
        el vectorstore: build_vectorstore() resuelve pgvector/chroma
        por env — el pipeline se hereda, no se duplica.
        """
        if self._rag_service is None:
            self._rag_service = self._build_rag_service()
        return self._rag_service

    @property
    def rag_service_ready(self) -> Any:
        """
        RAG service if ALREADY built, else None (0055, W-2b).

        Bootstrap needs the instance WITHOUT triggering the lazy
        build (loading bge-m3 at bootstrap is a behavior change).
        """
        return self._rag_service

    def _build_rag_service(self) -> Any:
        """Build and connect all RAG components (idéntico al in-memory)."""
        from club_mcp.rag.embeddings import EmbeddingService
        from club_mcp.rag.pg_vectorstore import build_vectorstore
        from club_mcp.rag.rag_service import RAGService
        from club_mcp.rag.reranker import Reranker
        from club_mcp.rag.search import HybridSearchEngine

        embeddings = EmbeddingService()
        # Ola 2.2 opt-in: CLUB_RAG_BACKEND=pgvector → PgVectorStore
        # (tabla rag_chunks); default → ChromaVectorStore (sin cambio).
        vectorstore = build_vectorstore()
        search = HybridSearchEngine(embeddings, vectorstore)
        reranker = Reranker()

        logger.info("[doc_repo] Initializing RAG service (models loading...)")

        return RAGService(
            embeddings=embeddings,
            vectorstore=vectorstore,  # type: ignore[arg-type]  # anotación Chroma-only de RAGService (2.2): deuda pre-existente — idéntica al in-memory L99
            search=search,
            reranker=reranker,
            claude=self._claude_service,
        )

    # ══════════════════════════════════════════════════════
    # DOCUMENT METADATA CRUD (documents table)
    # ══════════════════════════════════════════════════════

    async def create_document(self, data: CreateDocument) -> Document:
        """Create a document metadata entry (not the content — that's RAG)."""
        doc_id = uuid4().hex[:12]
        now = _now_iso()
        seq = await _next_seq(self._engine, DocumentORM)

        rec = DocumentORM(
            id=doc_id,
            seq=seq,
            title=data.title or data.file_name,
            file_name=data.file_name,
            document_type=data.document_type.value,
            category=data.category.value,
            access_level=data.access_level.value,
            status=DocumentStatus.DRAFT.value,
            ingestion_status=IngestionStatus.INDEXED.value,
            tags=list(data.tags),
            chunk_count=0,
            content_preview="",
            file_size_bytes=0,
            page_count=0,
            has_tables=False,
            uploaded_by=data.uploaded_by,
            notes=data.notes,
            version=1,
            created_at=now,
            updated_at=now,
        )
        async with session_scope(self._engine) as s:
            s.add(rec)
        return _doc_from_orm(rec)

    async def get_document(self, doc_id: str) -> Document | None:
        """Get document metadata by ID."""
        async with session_scope(self._engine) as s:
            row = await s.get(DocumentORM, doc_id)
            if row is None:
                return None
            return _doc_from_orm(row)

    async def list_documents(
        self,
        category: str = "",
        document_type: str = "",
        access_level: str = "",
        status: str = "",
    ) -> list[Document]:
        """List document metadata with optional filters."""
        out: list[Document] = []
        async with session_scope(self._engine) as s:
            for row in (
                await s.execute(
                    select(DocumentORM).order_by(DocumentORM.seq)
                )
            ).scalars():
                if category and row.category != category:
                    continue
                if document_type and row.document_type != document_type:
                    continue
                if access_level and row.access_level != access_level:
                    continue
                if status and row.status != status:
                    continue
                out.append(_doc_from_orm(row))
        return out

    async def update_document(self, doc_id: str, updates: dict[str, Any]) -> Document | None:
        """Update document metadata."""
        async with session_scope(self._engine) as s:
            row = await s.get(DocumentORM, doc_id)
            if row is None:
                return None
            for k, v in updates.items():
                if k in _DOC_COLS and hasattr(row, k):
                    setattr(row, k, v)
            row.updated_at = _now_iso()
            return _doc_from_orm(row)

    async def delete_document(self, doc_id: str) -> bool:
        """Delete document metadata and RAG data."""
        async with session_scope(self._engine) as s:
            row = await s.get(DocumentORM, doc_id)
            if row is None:
                return False

        # Delete from RAG (pgvector/chroma + BM25) — best-effort
        try:
            await self.rag.delete_document(doc_id)
        except Exception as exc:
            logger.warning("[doc_repo] RAG delete failed for '%s': %s", doc_id, exc)

        # Delete metadata
        async with session_scope(self._engine) as s:
            row = await s.get(DocumentORM, doc_id)
            if row is not None:
                await s.delete(row)
        logger.info("[doc_repo] Document deleted: %s", doc_id)
        return True

    # ══════════════════════════════════════════════════════
    # RAG CONTRACT (0055) — idéntico al in-memory
    # ══════════════════════════════════════════════════════

    async def search_chunks(
        self,
        query: str,
        user_role: str = "socio",
        top_k: int = 20,
        category: str | None = None,
        document_type: str | None = None,
    ) -> list[Any]:
        """
        Hybrid search over chunks (BM25 + vector + RRF) with populated content.

        Exactly what query_documents' tunnel did: search_engine.search +
        populate_content (content="" from hybrid search is filled from
        the vectorstore — b0v). Q-SEC-04: least privilege default.
        """
        candidates = await self.rag.search_engine.search(
            query=query,
            user_role=user_role,
            top_k=top_k,
            category=category,
            document_type=document_type,
        )
        populated: list[Any] = self.rag.populate_content(candidates)
        return populated

    def update_access_metadata(
        self,
        document_id: str,
        access_level: str,
    ) -> None:
        """
        Propagate an access-level change to the RAG chunks' metadata.

        Exactly what the HITL executors' duplicated ChromaDB block did
        (execute_ingest_document + execute_document_access_change —
        absorbed once): fetch chunks by document_id, rewrite
        access_level, update. Sits on vectorstore public API only.
        Failure is logged and swallowed (best-effort, as before).
        """
        from club_mcp.rag.vectorstore import ACCESS_HIERARCHY

        try:
            chunks = self.rag.vectorstore.get_chunks_by_document(document_id)
            if chunks.get("ids"):
                updated_metas: list[dict[str, Any]] = []
                for meta in chunks["metadatas"]:
                    meta["access_level"] = ACCESS_HIERARCHY.get(access_level, 1)
                    updated_metas.append(meta)
                self.rag.vectorstore.update(
                    ids=chunks["ids"],
                    metadatas=updated_metas,
                )
        except Exception as exc:
            logger.warning("[doc_repo] RAG access metadata update failed for '%s': %s", document_id, exc)

    async def query_knowledge_rag(
        self,
        question: str,
        user_role: str = "socio",
        conversation_id: str | None = None,
        max_sources: int = 5,
    ) -> Any:
        """
        Raw RAGResponse from the conversational pipeline.

        execute_knowledge_report needs sources + answer separately
        (dict-typed query_knowledge loses the response object).
        Q-SEC-04: least privilege default.
        """
        return await self.rag.query_rag(
            question=question,
            user_role=user_role,
            conversation_id=conversation_id,
            max_sources=max_sources,
        )

    # ══════════════════════════════════════════════════════
    # RAG DELEGATION — idéntico al in-memory
    # ══════════════════════════════════════════════════════

    async def search_documents_rag(
        self,
        query: str,
        # Q-SEC-04 (Ola 1.2 · cierre 0055): least privilege — el default
        # del repo pasa de "admin" a "socio". La capa agente ya
        # endureció en Ola 1.2; este es el mismo residuo cerrado.
        user_role: str = "socio",
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
        # Q-SEC-04 (Ola 1.2 · cierre 0055): mismo least-privilege que
        # search_documents_rag — el default del repo es socio.
        user_role: str = "socio",
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
        rag_result: dict[str, Any] = await self.rag.ingest_text(
            text=text,
            file_name=file_name,
            document_type=document_type,
            category=category,
            access_level=access_level,
            tags=tags,
            uploaded_by=uploaded_by,
        )

        if rag_result.get("status") != "success":
            return dict(rag_result)

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

        now = _now_iso()
        doc_id = rag_result.get("document_id", uuid4().hex[:12])

        needs_review = doc_type in (DocumentType.CONTRACT, DocumentType.BYLAW)

        seq = await _next_seq(self._engine, DocumentORM)
        rec = DocumentORM(
            id=doc_id,
            seq=seq,
            title=file_name,
            file_name=file_name,
            document_type=doc_type.value,
            category=cat.value,
            access_level=acc.value,
            status=DocumentStatus.DRAFT.value if needs_review else DocumentStatus.PUBLISHED.value,
            ingestion_status=IngestionStatus.PENDING_REVIEW.value if needs_review else IngestionStatus.INDEXED.value,
            tags=tags or [],
            chunk_count=rag_result.get("chunk_count", 0),
            content_preview=text[:200] if text else "",
            file_size_bytes=len(text.encode("utf-8")),
            page_count=rag_result.get("page_count", 0),
            has_tables=rag_result.get("has_tables", False),
            uploaded_by=uploaded_by,
            notes=notes,
            version=1,
            created_at=now,
            updated_at=now,
        )
        async with session_scope(self._engine) as s:
            s.add(rec)

        logger.info("[doc_repo] Ingested '%s' — %d chunks, metadata created", file_name, rag_result.get("chunk_count", 0))

        # MISMA forma que el in-memory: {**rag_result, "document": record}
        # con record = dict plano del shape de la fila.
        record = _doc_from_orm(rec).model_dump()
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
        # Get a source chunk directly by metadata — no embedding needed
        # (P2-C3h b0v: the old embed_query("") hack always raised
        # ValueError "Cannot embed empty query"; search_similar never worked).
        source_text: str | None = None
        try:
            fetched = self.rag.vectorstore.get_chunks_by_document(
                document_id=document_id,
                limit=1,
                include=["documents"],
            )
            docs = fetched.get("documents") or []
            source_text = docs[0] if docs else None
        except Exception as exc:
            logger.warning("[doc_repo] Could not fetch source chunk: %s", exc)

        if not source_text:
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
                    {"document_id": s.document.id, "file_name": s.title,
                     "similarity_score": s.relevance_score}
                    for s in similar
                ],
            }

        # Use the source document's embedding to find similar
        # (0055: RAGService._embeddings via the public property —
        # the pgvector swap of 2.2 replaces these internals in ONE file.)
        source_embedding = self.rag.embeddings.embed_query(
            source_text[:500]
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
            meta: dict[str, Any] = next(
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
    # REPORTS CRUD (knowledge_reports table)
    # ══════════════════════════════════════════════════════

    async def create_report(self, data: CreateKnowledgeReport) -> KnowledgeReport:
        """Create a knowledge report."""
        report_id = uuid4().hex[:8]
        now = _now_iso()
        seq = await _next_seq(self._engine, KnowledgeReportORM)
        rec = KnowledgeReportORM(
            id=report_id,
            seq=seq,
            topic=data.topic,
            audience=data.audience,
            summary=data.summary,
            source_documents=list(data.source_documents),
            key_findings=list(data.key_findings),
            date_from=data.date_from,
            date_to=data.date_to,
            categories=list(data.categories),
            status="draft",
            created_at=now,
            updated_at=now,
        )
        async with session_scope(self._engine) as s:
            s.add(rec)
        logger.info("[doc_repo] Knowledge report created: %s (%s)", data.topic, report_id)
        return _report_from_orm(rec)

    async def get_report(self, report_id: str) -> KnowledgeReport | None:
        async with session_scope(self._engine) as s:
            row = await s.get(KnowledgeReportORM, report_id)
            if row is None:
                return None
            return _report_from_orm(row)

    async def list_reports(self, audience: str = "", status: str = "") -> list[KnowledgeReport]:
        out: list[KnowledgeReport] = []
        async with session_scope(self._engine) as s:
            for row in (
                await s.execute(
                    select(KnowledgeReportORM).order_by(KnowledgeReportORM.seq)
                )
            ).scalars():
                if audience and row.audience != audience:
                    continue
                if status and row.status != status:
                    continue
                out.append(_report_from_orm(row))
        return out

    async def update_report(self, report_id: str, updates: dict[str, Any]) -> KnowledgeReport | None:
        async with session_scope(self._engine) as s:
            row = await s.get(KnowledgeReportORM, report_id)
            if row is None:
                return None
            for k, v in updates.items():
                if k in _REPORT_COLS and hasattr(row, k):
                    setattr(row, k, v)
            row.updated_at = _now_iso()
            return _report_from_orm(row)

    # ══════════════════════════════════════════════════════
    # STATS
    # ══════════════════════════════════════════════════════

    async def get_stats(self) -> dict[str, Any]:
        """Aggregated stats from documents table + RAG vector store."""
        async with session_scope(self._engine) as s:
            rows = list(
                (await s.execute(select(DocumentORM).order_by(DocumentORM.seq))).scalars()
            )
        by_type: dict[str, int] = {}
        by_category: dict[str, int] = {}
        by_access: dict[str, int] = {}
        total_size = 0

        # MISMA aritmética del in-memory sobre los valores crudos de
        # columna (str .value, no enums Pydantic — las keys del dict
        # son str en ambos).
        for d in rows:
            t = d.document_type
            by_type[t] = by_type.get(t, 0) + 1
            c = d.category
            by_category[c] = by_category.get(c, 0) + 1
            a = d.access_level
            by_access[a] = by_access.get(a, 0) + 1
            total_size += d.file_size_bytes

        metadata_stats = {
            "total_documents": len(rows),
            "total_chunks": sum(d.chunk_count for d in rows),
            "total_size_bytes": total_size,
            "by_type": by_type,
            "by_category": by_category,
            "by_access_level": by_access,
        }

        # Merge with RAG stats SOLO si ya fue construido (W-2b, run #70:
        # self.rag es LAZY — al tocarla acá dispara el build del RAG y la
        # descarga de bge-m3 (2.3 GB) en el runner: >30s = pytest-timeout.
        # get_stats() es una lectura de metadatos: nunca debe construir
        # el pipeline — misma regla que rag_service_ready en bootstrap).
        rag_stats = self.rag_service_ready
        if rag_stats is not None:
            try:
                return {
                    **metadata_stats,
                    "rag": rag_stats.get_stats(),
                }
            except Exception as exc:
                logger.warning("[doc_repo] Could not get RAG stats: %s", exc)
        return metadata_stats
