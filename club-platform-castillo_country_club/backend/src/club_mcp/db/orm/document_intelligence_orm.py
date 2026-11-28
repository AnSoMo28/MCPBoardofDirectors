"""Tablas del dominio Document Intelligence — Ola 2.1-decimoctava.

Espejo 1:1 del estado interno del repo in-memory
(club_mcp.db.repositories.document_intelligence_repo):

    _documents: dict[str, dict] → documents (tags JSONB)
    _reports:   dict[str, dict] → knowledge_reports (source_documents
                                · key_findings · categories JSONB)

El vertical (Q-PER-01) persiste SOLO el estado durable de metadatos y
reports: la capa RAG (embeddings + vectorstore + BM25) YA se migró en
la Ola 2.2 (pgvector · rag_chunks) y el repo ORM conserva el pipeline
RAG completo con la MISMA construcción lazy del in-memory — este
módulo es el espejo de los 2 dicts, nada más.

Los enums del dominio (DocumentType · DocumentCategory ·
DocumentAccessLevel · DocumentStatus · IngestionStatus) NO son
constraint CHECK: el repo guarda .value en String(32) y Pydantic
reconstruye el enum al leer — el contrato del agente pasa enums y str
indistintamente (coerción del borde); un CHECK duplicaría la
validación que Pydantic ya hace (mismo estilo que las 17 verticales
previas §3.8..§3.8-DECIMASEPTIMA).

Las listas (tags · key_findings · categories) y la lista de dicts
(source_documents) van JSONB por fila: anexo del agregado, no
entidades con identity propia — mismo criterio que families
(§3.8-bis) hasta member_360 (§3.8-DECIMASEPTIMA).

created_at/updated_at: el in-memory SIEMPRE los fija el repo (ISO
str) — la columna los persiste Text y el repo ORM los relee igual:
roundtrip pérdida cero, MISMA semántica (update re-fija updated_at
SIEMPRE).

Sin índices: todos los reads del contrato cargan la tabla (chica) y
filtran en Python EXACTO como el in-memory iteraba .values() — pero
el orden de inserción NO puede ser order_by(id) como en las 17
verticales previas: los ids de este dominio son uuid4().hex[:12] /
[:8] ALEATORIOS (sin prefijo), así que el id NO codifica el orden.
Columna técnica seq (Integer, autoincrement implícito por inserción)
espeja el orden .values() del dict — NO es contractual (no sube al
Pydantic, no la toca update_document) y cada create la fija monótona
(datetime.now() con resolución de microsegundos puede colisionar en
dos creates del mismo test: seq es el canon determinista — lección
run #56 aplicada a un dominio SIN prefijo de id).
"""
from __future__ import annotations

from typing import Any

from sqlalchemy import JSON, Boolean, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base


# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
# (idéntico a families §3.8-bis … member_360 §3.8-DECIMASEPTIMA).
JSONType = JSONB().with_variant(JSON(), "sqlite")


class DocumentORM(Base):
    """Metadatos de documento — espejo de Document (tags JSONB).

    seq: columna técnica de orden de inserción (NO contractual — el
    in-memory iteraba .values() en ese orden; los ids uuid4 aleatorios
    no lo codifican).
    """

    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    seq: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    title: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    file_name: Mapped[str] = mapped_column(String(240), nullable=False)
    document_type: Mapped[str] = mapped_column(String(32), nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    access_level: Mapped[str] = mapped_column(String(32), nullable=False, default="internal")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    ingestion_status: Mapped[str] = mapped_column(String(32), nullable=False, default="indexed")
    tags: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    content_preview: Mapped[str] = mapped_column(Text, nullable=False, default="")
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    page_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    has_tables: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    uploaded_by: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    updated_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)


class KnowledgeReportORM(Base):
    """Reporte de conocimiento — espejo de KnowledgeReport (JSONB lists).

    seq: columna técnica de orden de inserción (NO contractual — el
    in-memory iteraba .values() en ese orden).
    """

    __tablename__ = "knowledge_reports"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    seq: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    topic: Mapped[str] = mapped_column(String(240), nullable=False)
    audience: Mapped[str] = mapped_column(String(32), nullable=False, default="internal")
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    source_documents: Mapped[list[dict[str, Any]]] = mapped_column(JSONType, nullable=False, default=list)
    key_findings: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    date_from: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    date_to: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    categories: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    created_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    updated_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
