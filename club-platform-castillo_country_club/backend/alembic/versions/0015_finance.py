"""Ola 2.1-decimoquinta — 5 tablas del dominio Finance.

Revision ID: 0015
Revises: 0014
Create Date: 2026-11-21

Espejo 1:1 de db/orm/finance_orm.py (FinanceExpenseORM ·
FinanceInvoiceORM · FinancePaymentORM · FinanceBudgetORM ·
FinanceCashBalanceORM) — constraint names deterministas por la
naming_convention de Base (pk_<table>).

JSONB (postgres) con variante JSON (sqlite/dev) para las listas/dicts
del agregado: items (facturas) — mismo criterio que families §3.8-bis
hasta sports §3.8-DECIMOCUARTA.

Los enums NO son constraint CHECK: el repo guarda .value (String(32))
y reconstruye el Pydantic enum al leer — el contrato del agente pasa
enums; un CHECK duplicaría la validación que Pydantic ya hace en el
borde (mismo estilo que las 14 verticales previas).

Estados de primera clase (H-3): finance_budgets (PK natural
category) nace con las 9 filas ExpenseCategory 0.0 — la siembra la
garantiza el repo (_ensure_seed_states, idempotente) porque el
in-memory las siembra en __init__; finance_cash_balance (singleton
id=1) nace con el ₡45,000,000 inicial — el seed del comentario del
in-memory es estado REAL observable vía get_cash_position.

Sin índices: todos los reads del contrato cargan la tabla (chica) y
filtran en Python EXACTO como el in-memory iteraba .values() — mismo
orden de inserción, mismo contrato observable (criterio sin-índice de
communication §3.8-OCTAVA).
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from club_mcp.db.orm.base import Base


revision: str = "0015"
down_revision: str | None = "0014"
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
    """5 tablas del vertical finance."""
    # finance_expenses — date solo si el Create no trae (la fija el repo)
    _mk(
        "finance_expenses",
        [
            sa.Column("id", sa.String(24), primary_key=True),
            sa.Column("description", sa.String(240), nullable=False),
            sa.Column("amount", sa.Float(), nullable=False),
            sa.Column("category", sa.String(32), nullable=False),
            sa.Column("vendor", sa.String(240), nullable=False, server_default=""),
            sa.Column("date", sa.String(16), nullable=False, server_default=""),
            sa.Column("notes", sa.Text(), nullable=False, server_default=""),
            sa.Column("receipt_url", sa.Text(), nullable=False, server_default=""),
            sa.Column("created_at", sa.Text(), nullable=True),
        ],
    )
    # finance_invoices — items JSONB · status DRAFT · paid_date "" del create
    _mk(
        "finance_invoices",
        [
            sa.Column("id", sa.String(24), primary_key=True),
            sa.Column("family_id", sa.String(64), nullable=False),
            sa.Column("family_name", sa.String(240), nullable=False, server_default=""),
            sa.Column("items", JSONType, nullable=False),
            sa.Column("subtotal", sa.Float(), nullable=False, server_default="0"),
            sa.Column("tax", sa.Float(), nullable=False, server_default="0"),
            sa.Column("total", sa.Float(), nullable=False, server_default="0"),
            sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
            sa.Column("due_date", sa.String(16), nullable=False, server_default=""),
            sa.Column("paid_date", sa.String(16), nullable=False, server_default=""),
            sa.Column("notes", sa.Text(), nullable=False, server_default=""),
            sa.Column("created_at", sa.Text(), nullable=True),
        ],
    )
    # finance_payments — status PENDING del create · method .value
    _mk(
        "finance_payments",
        [
            sa.Column("id", sa.String(24), primary_key=True),
            sa.Column("invoice_id", sa.String(24), nullable=False, server_default=""),
            sa.Column("family_id", sa.String(64), nullable=False),
            sa.Column("family_name", sa.String(240), nullable=False, server_default=""),
            sa.Column("amount", sa.Float(), nullable=False),
            sa.Column("method", sa.String(32), nullable=False, server_default="transfer"),
            sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
            sa.Column("reference", sa.String(64), nullable=False, server_default=""),
            sa.Column("date", sa.String(16), nullable=False, server_default=""),
            sa.Column("notes", sa.Text(), nullable=False, server_default=""),
            sa.Column("created_at", sa.Text(), nullable=True),
        ],
    )
    # finance_budgets — H-3: dict[str, float] → tabla (PK natural category)
    _mk(
        "finance_budgets",
        [
            sa.Column("category", sa.String(32), primary_key=True),
            sa.Column("amount", sa.Float(), nullable=False, server_default="0"),
        ],
    )
    # finance_cash_balance — H-3: singleton id=1 con el ₡45M inicial
    _mk(
        "finance_cash_balance",
        [
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("balance", sa.Float(), nullable=False, server_default="45000000.0"),
        ],
    )


def downgrade() -> None:
    """5 tablas del vertical finance (down determinista)."""
    for t in (
        "finance_cash_balance",
        "finance_budgets",
        "finance_payments",
        "finance_invoices",
        "finance_expenses",
    ):
        sa.Table(t, Base.metadata).drop(checkfirst=True)
