"""rag_chunks ORM — Ola 2.2 (Chroma→pgvector).

Espejo 1:1 del diseño del swap (pg_vectorstore.py): una fila por
chunk (lo que ChromaDB guardaba: ids/embeddings/documents/
metadatas). El store accede via SQL asyncpg crudo; el ORM existe
para Base.metadata (create_all de las suites de persistencia) y
alembic 0019 (producción).

Columnas espejo del store:
    chunk_id     PK (ChromaDB id)
    document_id  VARCHAR(64) — índice (delete_by_document /
                 get_chunks_by_document filtran por acá)
    document     TEXT (chunk content)
    embedding    Vector(1024) — bge-m3 normalizado (cosine <=>)
    access_level INTEGER — columna dedicada: el WHERE $lte del ACL
                 es index-backed, no un escaneo de JSONB
    metadata_json JSONB — el resto del metadata sanitizado
                 (mismos valores que chromadb: str/int/float/bool;
                 lists/dicts → JSON strings)

Variante sqlite (lección 0018): las suites de persistencia corren
local sin PG — el embedding baja a TEXT (json.dumps del vector) y
JSONB baja a JSON. En CI contra pgvector/pgvector:pg16 son los
tipos nativos. Sin seed: la migración de datos chroma→pg es
operación runtime (seed script), no DDL.
"""

from __future__ import annotations

from typing import Any

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from club_mcp.db.orm.base import Base


def _embedding() -> sa.types.TypeEngine[Any]:
    """Vector(1024) en PG; TEXT en sqlite (json.dumps del vector)."""
    from pgvector.sqlalchemy import Vector

    emb: sa.types.TypeEngine[Any] = Vector(1024).with_variant(sa.Text(), "sqlite")
    return emb


def _jsonb() -> sa.types.TypeEngine[Any]:
    col: sa.types.TypeEngine[Any] = JSONB().with_variant(sa.JSON(), "sqlite")
    return col


class RagChunkORM(Base):
    """Una fila por chunk — el vector store sobre pgvector."""

    __tablename__ = "rag_chunks"

    chunk_id = sa.Column("chunk_id", sa.String(length=64), nullable=False)
    sa.PrimaryKeyConstraint(chunk_id, name="pk_rag_chunks")

    document_id = sa.Column("document_id", sa.String(length=64), nullable=False)
    document = sa.Column("document", sa.Text(), nullable=False)
    embedding = sa.Column("embedding", _embedding(), nullable=False)
    access_level = sa.Column("access_level", sa.Integer(), nullable=False, default=0)
    metadata_json = sa.Column("metadata_json", _jsonb(), nullable=False)

    sa.Index("ix_rag_chunks_document_id", document_id)
    sa.Index("ix_rag_chunks_access_level", access_level)
