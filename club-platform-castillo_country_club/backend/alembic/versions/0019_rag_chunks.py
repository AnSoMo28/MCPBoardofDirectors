"""Ola 2.2 — tabla rag_chunks del swap Chroma→pgvector.

Revision ID: 0019
Revises: 0018
Create Date: 2026-11-23

Espejo 1:1 de db/orm/rag_orm.py (RagChunkORM) — constraint names
deterministas por la naming_convention de Base (pk_rag_chunks).

Vector(1024): la extensión `vector` debe existir — la crea el
step con `CREATE EXTENSION IF NOT EXISTS vector` (idempotente; en
el service pgvector/pgvector:pg16 ya viene preinstalada).

Sin índice HNSW a propósito: el corpus inicial es pequeño (<10k
chunks) y el seq scan con ORDER BY <=> es el correcto para ese
volumen; HNSW es un índice de producción con costo de build y
parámetros que se tunean CON datos reales. Cuando el volumen lo
pida, su migración: CREATE INDEX ... USING hnsw (embedding
vector_cosine_ops) — registrada como deuda, no como omisión.

Sin seed: la migración de datos chroma→pg (./data/chromadb) es
operación runtime (seed script de la Ola 2.2), no DDL.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op
from club_mcp.db.orm.base import Base  # noqa: F401 — target_metadata


revision: str = "0019"
down_revision: str | None = "0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:
    return JSONB().with_variant(sa.JSON(), "sqlite")


def upgrade() -> None:
    """Tabla del swap Chroma→pgvector (Ola 2.2)."""
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "rag_chunks",
        sa.Column("chunk_id", sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint("chunk_id", name="pk_rag_chunks"),
        sa.Column("document_id", sa.String(length=64), nullable=False),
        sa.Column("document", sa.Text(), nullable=False),
        sa.Column("embedding", _embedding_col(), nullable=False),
        sa.Column("access_level", sa.Integer(), nullable=False),
        sa.Column("metadata_json", _jsonb(), nullable=False),
    )
    op.create_index(
        "ix_rag_chunks_document_id", "rag_chunks", ["document_id"]
    )
    op.create_index(
        "ix_rag_chunks_access_level", "rag_chunks", ["access_level"]
    )


def _embedding_col() -> sa.types.TypeEngine:
    """Vector(1024) — import local: pgvector solo se resuelve en runtime."""
    from pgvector.sqlalchemy import Vector

    return Vector(1024)


def downgrade() -> None:
    op.drop_index("ix_rag_chunks_access_level", table_name="rag_chunks")
    op.drop_index("ix_rag_chunks_document_id", table_name="rag_chunks")
    op.drop_table("rag_chunks")
