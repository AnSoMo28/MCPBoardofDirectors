"""Ola 2.1-decimoctava — 2 tablas del dominio Document Intelligence.

Revision ID: 0020
Revises: 0019
Create Date: 2026-11-23

Espejo 1:1 de db/orm/document_intelligence_orm.py (DocumentORM ·
KnowledgeReportORM) — constraint names deterministas por la
naming_convention de Base (pk_<table>).

JSONB (postgres) con variante JSON (sqlite/dev) para las listas del
agregado: tags (documents) · source_documents · key_findings ·
categories (knowledge_reports) — mismo criterio que families
§3.8-bis hasta member_360 §3.8-DECIMASEPTIMA.

Los enums NO son constraint CHECK: el repo guarda .value
(String(32)) y Pydantic reconstruye el enum al leer — el contrato
del agente pasa enums y str indistintamente; un CHECK duplicaría la
validación que Pydantic ya hace en el borde (mismo estilo que las
17 verticales previas).

Sin índices: todos los reads del contrato cargan la tabla (chica) y
filtran en Python EXACTO como el in-memory iteraba .values() — mismo
orden de inserción, mismo contrato observable (criterio sin-índice
de communication §3.8-OCTAVA · lección run #56: todo orden
contractual lleva order_by(id) explícito en el repo).

Sin seed: el in-memory nace VACÍO — las tablas nacen VACÍAS igual:
contrato vacío idéntico.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from club_mcp.db.orm.base import Base


revision: str = "0020"
down_revision: str | None = "0019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
JSONType = postgresql.JSONB().with_variant(sa.JSON(), "sqlite")


def _mk(table: str, cols: list) -> None:
    sa.Table(
        table,
        Base.metadata,
        *[c.copy() for c in cols],
        keep_existing=True,
    )


def upgrade() -> None:
    """2 tablas del vertical document_intelligence."""
    # documents — tags JSONB · enums .value · created/updated ISO Text
    # seq: columna técnica de orden de inserción (NO contractual —
    # in-memory .values(); ids uuid4 aleatorios no codifican orden).
    _mk(
        "documents",
        [
            sa.Column("id", sa.String(24), primary_key=True),
            sa.Column("seq", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("title", sa.String(240), nullable=False, server_default=""),
            sa.Column("file_name", sa.String(240), nullable=False),
            sa.Column("document_type", sa.String(32), nullable=False),
            sa.Column("category", sa.String(32), nullable=False),
            sa.Column("access_level", sa.String(32), nullable=False, server_default="internal"),
            sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
            sa.Column("ingestion_status", sa.String(32), nullable=False, server_default="indexed"),
            sa.Column("tags", JSONType, nullable=False),
            sa.Column("chunk_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("content_preview", sa.Text(), nullable=False, server_default=""),
            sa.Column("file_size_bytes", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("page_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("has_tables", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("uploaded_by", sa.String(120), nullable=False, server_default=""),
            sa.Column("notes", sa.Text(), nullable=False, server_default=""),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("created_at", sa.Text(), nullable=True),
            sa.Column("updated_at", sa.Text(), nullable=True),
        ],
    )
    # knowledge_reports — status "draft" literal · 3 listas + 1 lista-de-dicts JSONB
    _mk(
        "knowledge_reports",
        [
            sa.Column("id", sa.String(24), primary_key=True),
            sa.Column("seq", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("topic", sa.String(240), nullable=False),
            sa.Column("audience", sa.String(32), nullable=False, server_default="internal"),
            sa.Column("summary", sa.Text(), nullable=False, server_default=""),
            sa.Column("source_documents", JSONType, nullable=False),
            sa.Column("key_findings", JSONType, nullable=False),
            sa.Column("date_from", sa.String(16), nullable=False, server_default=""),
            sa.Column("date_to", sa.String(16), nullable=False, server_default=""),
            sa.Column("categories", JSONType, nullable=False),
            sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
            sa.Column("created_at", sa.Text(), nullable=True),
            sa.Column("updated_at", sa.Text(), nullable=True),
        ],
    )


def downgrade() -> None:
    """2 tablas del vertical document_intelligence (down determinista)."""
    for t in (
        "knowledge_reports",
        "documents",
    ):
        sa.Table(t, Base.metadata).drop(checkfirst=True)
